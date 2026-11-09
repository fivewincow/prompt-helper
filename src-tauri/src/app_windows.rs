//! Creates, places and shows the app's secondary windows.

use tauri::{AppHandle, Emitter, Manager, Monitor, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};

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

/// Opens the editor window, or brings it to the front if it is already open.
/// `tab` selects the starting tab (wired up in Task 15).
#[tauri::command]
pub fn open_editor(app: AppHandle, tab: Option<String>) -> Result<(), String> {
    let _ = tab;
    if let Some(w) = app.get_webview_window("editor") {
        let _ = w.unminimize();
        w.show().map_err(|e| e.to_string())?;
        return w.set_focus().map_err(|e| e.to_string());
    }
    let w = WebviewWindowBuilder::new(&app, "editor", WebviewUrl::App("editor.html".into()))
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
