//! Creates, places and shows the app's secondary windows.

use tauri::{
    AppHandle, Emitter, LogicalSize, Manager, Monitor, PhysicalPosition, State, WebviewUrl,
    WebviewWindowBuilder,
};

use crate::focus::{self, RememberedTarget};

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
#[tauri::command]
pub fn show_toast(app: AppHandle, message: String) -> Result<(), String> {
    let window = match app.get_webview_window("toast") {
        Some(w) => {
            w.emit("toast-message", &message).map_err(|e| e.to_string())?;
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
        .map_err(|e| e.to_string())?,
    };
    if let Some(m) = monitor_under_cursor(&app) {
        let area = m.work_area();
        let scale = m.scale_factor();
        let x = f64::from(area.position.x) + f64::from(area.size.width) - (TOAST_SIZE.0 + TOAST_MARGIN) * scale;
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
    let (width, height) = if view == "palette" { PALETTE_SIZE } else { FILL_SIZE };
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

#[tauri::command]
pub fn hide_overlay(app: AppHandle) -> Result<(), String> {
    match app.get_webview_window("overlay") {
        Some(w) => w.hide().map_err(|e| e.to_string()),
        None => Ok(()),
    }
}

/// Gives focus back to the app the user was in (after Esc in the fill window or palette).
#[tauri::command]
pub async fn restore_focus(state: State<'_, RememberedTarget>) -> Result<(), String> {
    let target = *state.0.lock().unwrap();
    if let Some(t) = target {
        // Polls until the app is in front, so keep it off the main thread.
        tauri::async_runtime::spawn_blocking(move || focus::activate_and_wait(&t))
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Opens the editor window, or brings it to the front if it is already open.
/// `tab` picks the starting tab: through the URL fragment for a new window (its page is not
/// listening yet), through the `editor-tab` event for an open one.
#[tauri::command]
pub fn open_editor(app: AppHandle, tab: Option<String>) -> Result<(), String> {
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
}
