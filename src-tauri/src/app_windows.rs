//! Creates, places and shows the app's secondary windows.

use tauri::{
    AppHandle, Emitter, LogicalSize, Manager, Monitor, PhysicalPosition, State, WebviewUrl,
    WebviewWindowBuilder,
};

use crate::focus::{self, RememberedTarget};

// NSWindowCollectionBehavior bits (AppKit).
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
mod behavior {
    pub const CAN_JOIN_ALL_SPACES: usize = 1 << 0;
    pub const MOVE_TO_ACTIVE_SPACE: usize = 1 << 1;
    #[cfg(test)]
    pub const IGNORES_CYCLE: usize = 1 << 6;
    pub const FULL_SCREEN_PRIMARY: usize = 1 << 7;
    pub const FULL_SCREEN_AUXILIARY: usize = 1 << 8;
    pub const FULL_SCREEN_NONE: usize = 1 << 9;
}
use behavior::*;

/// Collection behavior for our popups: on every Space, including the Space of an app in full
/// screen, so a hotkey pressed there shows the popup there instead of somewhere unseen.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
fn popup_collection_behavior(current: usize) -> usize {
    (current & !(MOVE_TO_ACTIVE_SPACE | FULL_SCREEN_PRIMARY | FULL_SCREEN_NONE))
        | CAN_JOIN_ALL_SPACES
        | FULL_SCREEN_AUXILIARY
}

/// Lets `window` appear over full-screen apps (see `popup_collection_behavior`).
#[cfg(target_os = "macos")]
pub fn join_all_spaces(window: &tauri::WebviewWindow) {
    use objc2::msg_send;
    use objc2::runtime::AnyObject;
    let w = window.clone();
    // AppKit windows may only be touched on the main thread.
    let _ = window.run_on_main_thread(move || {
        let Ok(ptr) = w.ns_window() else { return };
        let ns = ptr.cast::<AnyObject>();
        // SAFETY: `ns` is this window's live NSWindow; both selectors take/return NSUInteger.
        unsafe {
            let current: usize = msg_send![ns, collectionBehavior];
            let _: () = msg_send![ns, setCollectionBehavior: popup_collection_behavior(current)];
        }
    });
}

#[cfg(not(target_os = "macos"))]
pub fn join_all_spaces(_window: &tauri::WebviewWindow) {}

const TOAST_SIZE: (f64, f64) = (320.0, 64.0);
const TOAST_MARGIN: f64 = 16.0;

/// The monitor the mouse is on, so popups appear where the user is looking.
fn monitor_under_cursor(app: &AppHandle) -> Option<Monitor> {
    let cursor = app.cursor_position().ok()?;
    app.monitor_from_point(cursor.x, cursor.y)
        .ok()
        .flatten()
        .or_else(|| app.primary_monitor().ok().flatten())
}

/// Percent-encodes text for a URL fragment (what JS decodeURIComponent reverses).
fn encode_fragment(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b"-_.~".contains(&b) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// Shows a short notice in the top-right corner without taking keyboard focus,
/// so the user can keep typing where they were.
// Window-creating commands are async: creating a window from a sync command deadlocks on Windows.
#[tauri::command]
pub async fn show_toast(app: AppHandle, message: String) -> Result<(), String> {
    let window = match app.get_webview_window("toast") {
        Some(w) => {
            w.emit("toast-message", &message)
                .map_err(|e| e.to_string())?;
            w
        }
        // A new window cannot receive events until its page has loaded, so the first
        // message travels in the URL fragment instead.
        None => WebviewWindowBuilder::new(
            &app,
            "toast",
            WebviewUrl::App(format!("toast.html#{}", encode_fragment(&message)).into()),
        )
        .title("Prompt Helper")
        .inner_size(TOAST_SIZE.0, TOAST_SIZE.1)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .focused(false)
        .focusable(false)
        .visible(false)
        .build()
        .inspect(join_all_spaces)
        .map_err(|e| e.to_string())?,
    };
    if let Some(m) = monitor_under_cursor(&app) {
        let area = m.work_area();
        let scale = m.scale_factor();
        let x = f64::from(area.position.x) + f64::from(area.size.width)
            - (TOAST_SIZE.0 + TOAST_MARGIN) * scale;
        let y = f64::from(area.position.y) + TOAST_MARGIN * scale;
        let _ = window.set_position(PhysicalPosition::new(x, y));
    }
    window.show().map_err(|e| e.to_string())
}

const PALETTE_SIZE: (f64, f64) = (600.0, 380.0);
const FILL_SIZE: (f64, f64) = (680.0, 520.0);
const OVERLAY_TOP: f64 = 120.0;

/// Shows the overlay window as the palette or the fill window: centered horizontally on the
/// monitor under the mouse, 120pt from the top, and focused so typing goes into it.
#[tauri::command]
pub fn show_overlay(app: AppHandle, view: String) -> Result<(), String> {
    let w = app
        .get_webview_window("overlay")
        .ok_or("overlay window is missing")?;
    let (width, height) = if view == "palette" {
        PALETTE_SIZE
    } else {
        FILL_SIZE
    };
    w.set_size(LogicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    if let Some(m) = monitor_under_cursor(&app) {
        let area = m.work_area();
        let scale = m.scale_factor();
        let x = f64::from(area.position.x) + (f64::from(area.size.width) - width * scale) / 2.0;
        let y = f64::from(area.position.y) + OVERLAY_TOP * scale;
        let _ = w.set_position(PhysicalPosition::new(x, y));
    }
    w.show().map_err(|e| e.to_string())?;
    w.set_focus().map_err(|e| e.to_string())
}

pub fn hide_overlay_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("overlay") {
        let _ = w.hide();
    }
}

#[tauri::command]
pub fn hide_overlay(app: AppHandle) {
    hide_overlay_window(&app);
}

/// Gives focus back to the app the user was in (after Esc in the fill window or palette).
#[tauri::command]
pub async fn restore_focus(
    app: AppHandle,
    state: State<'_, RememberedTarget>,
) -> Result<(), String> {
    let target = *state.0.lock().unwrap();
    // Polls until the app is in front, so keep it off the main thread. Activate first, then
    // hide the overlay (Windows only lets the foreground process hand the foreground away).
    tauri::async_runtime::spawn_blocking(move || {
        if let Some(t) = target {
            focus::activate_and_wait(&t);
        }
        hide_overlay_window(&app);
    })
    .await
    .map_err(|e| e.to_string())
}

/// Opens the editor window, or brings it to the front if it is already open.
/// `tab` picks the starting tab: through the URL fragment for a new window (its page is not
/// listening yet), through the `editor-tab` event for an open one.
#[tauri::command]
pub async fn open_editor(app: AppHandle, tab: Option<String>) -> Result<(), String> {
    let tab = tab.unwrap_or_else(|| "templates".into());
    if let Some(w) = app.get_webview_window("editor") {
        let _ = w.unminimize();
        w.show().map_err(|e| e.to_string())?;
        w.set_focus().map_err(|e| e.to_string())?;
        return w.emit("editor-tab", &tab).map_err(|e| e.to_string());
    }
    let url = format!("editor.html#{}", encode_fragment(&tab));
    let w = WebviewWindowBuilder::new(&app, "editor", WebviewUrl::App(url.into()))
        .title("Prompt Helper")
        .inner_size(980.0, 640.0)
        .min_inner_size(760.0, 480.0)
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    // The editor may close while it has the hotkeys paused for recording; tell the controller.
    let handle = app.clone();
    w.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            let _ = handle.emit_to("overlay", "editor-closed", ());
        }
    });
    // A menu bar app is not active by default, so explicitly bring the new window forward.
    w.set_focus().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_unreserved_ascii() {
        assert_eq!(encode_fragment("Codex-1_a.~"), "Codex-1_a.~");
    }

    #[test]
    fn encodes_spaces_symbols_and_korean_as_utf8() {
        assert_eq!(encode_fragment("a b:"), "a%20b%3A");
        assert_eq!(encode_fragment("모"), "%EB%AA%A8");
    }

    #[test]
    fn popups_join_every_space_including_full_screen_apps() {
        let b = popup_collection_behavior(0);
        assert_ne!(b & CAN_JOIN_ALL_SPACES, 0);
        assert_ne!(b & FULL_SCREEN_AUXILIARY, 0);
    }

    #[test]
    fn popup_behavior_drops_flags_that_conflict_and_keeps_the_rest() {
        // AppKit raises an exception for CanJoinAllSpaces with MoveToActiveSpace, and for
        // FullScreenAuxiliary with FullScreenPrimary or FullScreenNone.
        let b = popup_collection_behavior(
            MOVE_TO_ACTIVE_SPACE | FULL_SCREEN_PRIMARY | FULL_SCREEN_NONE | IGNORES_CYCLE,
        );
        assert_eq!(b & (MOVE_TO_ACTIVE_SPACE | FULL_SCREEN_PRIMARY | FULL_SCREEN_NONE), 0);
        assert_ne!(b & IGNORES_CYCLE, 0);
    }
}
