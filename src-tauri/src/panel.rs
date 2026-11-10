//! macOS: the overlay (fill window and palette) as a non-activating panel.
//!
//! macOS keeps regular windows off another app's full-screen Space, even with the
//! "join all Spaces" and "full-screen auxiliary" behaviors. A non-activating NSPanel is
//! allowed there, and it takes keyboard input without bringing this app to the front, so
//! the app the user was typing in stays active (and stays the paste target).

use tauri::{AppHandle, WebviewWindow};
use tauri_nspanel::{
    CollectionBehavior, ManagerExt, PanelLevel, StyleMask, WebviewWindowExt, tauri_panel,
};

const OVERLAY: &str = "overlay";

tauri_panel! {
    panel!(OverlayPanel {
        config: {
            can_become_key_window: true,
            is_floating_panel: true
        }
    })
}

/// Converts the overlay window once, at startup (on the main thread, from `setup`).
pub fn make_overlay_panel(window: &WebviewWindow) -> tauri::Result<()> {
    let panel = window.to_panel::<OverlayPanel>()?;
    panel.set_level(PanelLevel::Floating.value());
    panel
        .add_style_mask(StyleMask::empty().nonactivating_panel().into())
        .map_err(|e| std::io::Error::other(e.to_string()))?;
    panel.set_collection_behavior(
        CollectionBehavior::new()
            .full_screen_auxiliary()
            .can_join_all_spaces()
            .into(),
    );
    Ok(())
}

/// Shows the overlay and gives it the keyboard without activating this app.
pub fn show_and_focus(app: &AppHandle) {
    let handle = app.clone();
    // AppKit windows may only be touched on the main thread.
    let _ = app.run_on_main_thread(move || {
        if let Ok(panel) = handle.get_webview_panel(OVERLAY) {
            // Not show_and_make_key: that makes the content view first responder, which would
            // take the keyboard away from the web view inside it.
            panel.order_front_regardless();
            panel.make_key_window();
        }
    });
}
