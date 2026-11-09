//! Prompt Helper: a menu bar app that pastes AI prompt templates via global hotkeys.
//!
//! Rust only bridges OS features (hotkeys, clipboard, key simulation, focus, files).
//! All app logic lives in the TypeScript front end.

#[cfg(target_os = "macos")]
use tauri::menu::{Menu, PredefinedMenuItem, Submenu};
#[cfg(target_os = "macos")]
use tauri::{AppHandle, Runtime};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        // Registered first so a second launch is forwarded to the running instance
        // instead of starting a duplicate that would fight over the same hotkeys.
        .plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {
            // Task 15 opens the editor window here.
        }))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_opener::init());

    // On macOS, text fields only get Cmd+C/V/X/Z/A when the app menu has an Edit menu,
    // even though a menu bar app never shows its menu. Windows does not need this,
    // and setting it there would add a menu bar to every window.
    #[cfg(target_os = "macos")]
    let builder = builder.menu(build_app_menu);

    builder
        .setup(|app| {
            // Accessory policy: no Dock icon and no app switcher entry, like other menu bar apps.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let _ = app;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Builds the (invisible) app menu whose Edit items provide the standard text shortcuts.
#[cfg(target_os = "macos")]
fn build_app_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    // macOS always treats the first submenu as the application menu.
    let app_menu = Submenu::with_items(
        app,
        "Prompt Helper",
        true,
        &[&PredefinedMenuItem::close_window(app, None)?],
    )?;
    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;
    Menu::with_items(app, &[&app_menu, &edit_menu])
}
