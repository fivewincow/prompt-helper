//! Registers the global hotkeys the TS side asks for and forwards presses to the overlay window.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::focus;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Binding {
    pub action_id: String,
    pub accelerator: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RegistrationFailure {
    pub action_id: String,
    pub accelerator: String,
    pub message: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ShortcutTriggered {
    action_id: String,
}

fn overlay_visible(app: &AppHandle) -> bool {
    app.get_webview_window("overlay")
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false)
}

/// Replaces every registration with `bindings`. Returns the ones the OS refused
/// (bad accelerator string, or the keys are taken by another app).
#[tauri::command]
pub fn set_shortcuts(app: AppHandle, bindings: Vec<Binding>) -> Vec<RegistrationFailure> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    let mut failures = Vec::new();
    for b in bindings {
        let action_id = b.action_id.clone();
        let registered = gs.on_shortcut(b.accelerator.as_str(), move |app, _shortcut, event| {
            if event.state() != ShortcutState::Pressed {
                return;
            }
            // Remember where the user was typing, unless our overlay is already up:
            // then the target was remembered when it opened, and the front app is the overlay.
            if !overlay_visible(app) {
                focus::remember(app);
            }
            let _ = app.emit_to(
                "overlay",
                "shortcut-triggered",
                ShortcutTriggered {
                    action_id: action_id.clone(),
                },
            );
        });
        if let Err(e) = registered {
            failures.push(RegistrationFailure {
                action_id: b.action_id,
                accelerator: b.accelerator,
                message: e.to_string(),
            });
        }
    }
    failures
}
