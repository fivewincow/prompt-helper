//! macOS Accessibility permission: needed to send the paste keystroke to other apps.

use tauri::AppHandle;

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
unsafe extern "C" {
    // Returns a C Boolean (unsigned char): non-zero when this process may control other apps.
    fn AXIsProcessTrusted() -> u8;
}

/// Whether we may simulate key presses in other apps. Always true off macOS.
pub fn accessibility_trusted() -> bool {
    #[cfg(target_os = "macos")]
    {
        // SAFETY: AXIsProcessTrusted takes no arguments and only reads process state.
        unsafe { AXIsProcessTrusted() != 0 }
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

#[tauri::command]
pub fn check_accessibility() -> bool {
    accessibility_trusted()
}

/// Opens System Settings > Privacy & Security > Accessibility so the user can allow the app.
#[tauri::command]
pub fn open_accessibility_settings(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use tauri_plugin_opener::OpenerExt;
        app.opener()
            .open_url(
                "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
                None::<&str>,
            )
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        Ok(())
    }
}
