//! Pastes text into the remembered app by borrowing the clipboard and pressing Cmd/Ctrl+V,
//! then puts the user's original clipboard back.

use std::sync::Mutex;
use std::thread::sleep;
use std::time::{Duration, Instant};

use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use serde::Serialize;
use tauri::image::Image;
use tauri::{AppHandle, State};
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::app_windows;
use crate::focus::{self, RememberedTarget};
use crate::permissions;

/// Time the target app gets to read the clipboard before we restore the original.
/// Too short and the app pastes the restored (old) content instead of the template.
pub const RESTORE_DELAY_MS: u64 = 300;
/// Longest wait for the user to let go of the hotkey's modifier keys.
pub const MODIFIER_WAIT_MAX_MS: u64 = 1000;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PasteOutcome {
    Pasted,
    /// No Accessibility permission: the text is on the clipboard for the user to paste.
    CopiedOnly,
}

/// What was on the clipboard before we borrowed it. Formats other than text and images
/// (files, rich text) are not preserved; the README lists this limit.
enum ClipboardBackup {
    Text(String),
    Image(Image<'static>),
    Empty,
}

fn backup(app: &AppHandle) -> ClipboardBackup {
    let clip = app.clipboard();
    if let Ok(t) = clip.read_text()
        && !t.is_empty()
    {
        return ClipboardBackup::Text(t);
    }
    if let Ok(img) = clip.read_image() {
        return ClipboardBackup::Image(img.to_owned());
    }
    ClipboardBackup::Empty
}

fn restore(app: &AppHandle, b: ClipboardBackup) {
    let clip = app.clipboard();
    let _ = match b {
        ClipboardBackup::Text(t) => clip.write_text(t),
        ClipboardBackup::Image(img) => clip.write_image(&img),
        ClipboardBackup::Empty => clip.clear(),
    };
}

#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
unsafe extern "C" {
    // Current modifier flags of the physical keyboard (state id 1 = HID system state).
    fn CGEventSourceFlagsState(state_id: i32) -> u64;
}

#[cfg(target_os = "macos")]
fn modifiers_held() -> bool {
    // Shift | Control | Option | Command.
    const MASK: u64 = 0x20000 | 0x40000 | 0x80000 | 0x100000;
    // SAFETY: reads global keyboard state; no pointers involved.
    unsafe { CGEventSourceFlagsState(1) & MASK != 0 }
}

#[cfg(target_os = "windows")]
fn modifiers_held() -> bool {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        GetAsyncKeyState, VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
    };
    [VK_SHIFT, VK_CONTROL, VK_MENU, VK_LWIN, VK_RWIN]
        .iter()
        // SAFETY: reads global key state for a virtual key code.
        .any(|vk| (unsafe { GetAsyncKeyState(i32::from(vk.0)) } as u16) & 0x8000 != 0)
}

/// If the user still holds Control+Option from the hotkey, a simulated Cmd+V would arrive
/// as Control+Option+Cmd+V. Wait for the keys to come up first.
fn wait_for_modifiers_released() {
    let start = Instant::now();
    while modifiers_held() && start.elapsed() < Duration::from_millis(MODIFIER_WAIT_MAX_MS) {
        sleep(Duration::from_millis(10));
    }
}

/// Presses the platform paste shortcut. V is sent as a physical keycode (macOS kVK_ANSI_V = 9,
/// Windows VK_V = 0x56) rather than the character 'v', so it still works when a Korean
/// (or any non-Latin) input source is active.
fn send_paste() -> Result<(), String> {
    let settings = Settings {
        open_prompt_to_get_permissions: false,
        ..Settings::default()
    };
    let mut enigo = Enigo::new(&settings).map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    let (modifier, v) = (Key::Meta, Key::Other(9));
    #[cfg(target_os = "windows")]
    let (modifier, v) = (Key::Control, Key::Other(0x56));
    enigo
        .key(modifier, Direction::Press)
        .map_err(|e| e.to_string())?;
    let clicked = enigo.key(v, Direction::Click).map_err(|e| e.to_string());
    enigo
        .key(modifier, Direction::Release)
        .map_err(|e| e.to_string())?;
    clicked
}

/// Only one paste may hold the clipboard at a time. A second paste starting between another's
/// backup and restore would back up that paste's template and "restore" it at the end,
/// leaving the template on the user's clipboard.
static PASTE_LOCK: Mutex<()> = Mutex::new(());

pub fn serialized<T>(f: impl FnOnce() -> T) -> T {
    let _guard = PASTE_LOCK
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    f()
}

#[tauri::command]
pub async fn paste_text(
    app: AppHandle,
    state: State<'_, RememberedTarget>,
    text: String,
) -> Result<PasteOutcome, String> {
    let target = *state.0.lock().unwrap();
    let trusted = permissions::accessibility_trusted();
    // The sleeps below must not run on the main thread or the async runtime's workers.
    tauri::async_runtime::spawn_blocking(move || {
        serialized(|| {
            let original = trusted.then(|| backup(&app));
            app.clipboard()
                .write_text(text)
                .map_err(|e| e.to_string())?;
            // Bring the user's app forward first, then hide our overlay: Windows only lets a
            // process hand the foreground away while it still holds it. This also runs without
            // the permission, so a manual ⌘V lands in the right app.
            if let Some(t) = target {
                focus::activate_and_wait(&t);
            }
            app_windows::hide_overlay_window(&app);
            let Some(original) = original else {
                // No Accessibility permission: leave the text on the clipboard for the user.
                return Ok(PasteOutcome::CopiedOnly);
            };
            wait_for_modifiers_released();
            let sent = send_paste();
            sleep(Duration::from_millis(RESTORE_DELAY_MS));
            restore(&app, original);
            sent.map(|_| PasteOutcome::Pasted)
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::thread;

    #[test]
    fn pastes_never_overlap() {
        // Each paste borrows the one clipboard from backup to restore; a second paste starting
        // inside that window would back up the first one's template and restore it at the end.
        let log = Arc::new(Mutex::new(Vec::new()));
        let workers: Vec<_> = (0..4)
            .map(|i| {
                let log = Arc::clone(&log);
                thread::spawn(move || {
                    serialized(|| {
                        log.lock().unwrap().push(format!("start {i}"));
                        sleep(Duration::from_millis(20));
                        log.lock().unwrap().push(format!("end {i}"));
                    })
                })
            })
            .collect();
        for w in workers {
            w.join().unwrap();
        }
        let log = log.lock().unwrap();
        for pair in log.chunks(2) {
            let id = pair[0].trim_start_matches("start ");
            assert_eq!(pair[1], format!("end {id}"), "interleaved: {log:?}");
        }
    }
}
