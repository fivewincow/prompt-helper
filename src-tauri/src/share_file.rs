//! Saving and opening template share files.
//!
//! The save/open windows are shown from Rust, so the web view never hands Rust a file path:
//! only a file the user picked in the system window is ever read or written.

use std::fs;
use std::path::Path;

use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, FileDialogBuilder};

/// Same limit as SHARE_MAX_BYTES in src/core/share.ts.
pub const SHARE_MAX_BYTES: u64 = 1_000_000;

/// Reads a picked file as text, refusing anything over `max` bytes or not UTF-8.
pub fn read_limited(path: &Path, max: u64) -> Result<String, String> {
    let len = fs::metadata(path).map_err(|e| e.to_string())?.len();
    if len > max {
        return Err("파일이 너무 커요. 1MB 이하 파일만 가져올 수 있어요.".into());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let text = String::from_utf8(bytes).map_err(|_| "텍스트 파일이 아니에요.".to_string())?;
    // Windows Notepad may save a byte order mark, which JSON.parse rejects.
    Ok(text
        .strip_prefix('\u{feff}')
        .map(str::to_owned)
        .unwrap_or(text))
}

/// Writes `contents` to a picked file.
pub fn write_share(path: &Path, contents: &str) -> Result<(), String> {
    fs::write(path, contents).map_err(|e| e.to_string())
}

/// A save/open window for share files, attached to the editor window when it is open.
fn share_dialog(app: &AppHandle, title: &str) -> FileDialogBuilder<tauri::Wry> {
    let dialog = app
        .dialog()
        .file()
        .set_title(title)
        .add_filter("Prompt Helper 템플릿", &["json"]);
    match app.get_webview_window("editor") {
        Some(editor) => dialog.set_parent(&editor),
        None => dialog,
    }
}

/// Asks where to save and writes the file. `Ok(false)` means the user cancelled.
// Async + spawn_blocking: the blocking dialog must not run on the main thread.
#[tauri::command]
pub async fn export_share_file(
    app: AppHandle,
    contents: String,
    file_name: String,
) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let picked = share_dialog(&app, "템플릿 내보내기")
            .set_file_name(file_name)
            .blocking_save_file();
        let Some(picked) = picked else {
            return Ok(false);
        };
        let path = picked.into_path().map_err(|e| e.to_string())?;
        write_share(&path, &contents).map(|_| true)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Asks for a file and returns its text. `Ok(None)` means the user cancelled.
#[tauri::command]
pub async fn import_share_file(app: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(picked) = share_dialog(&app, "템플릿 가져오기").blocking_pick_file() else {
            return Ok(None);
        };
        let path = picked.into_path().map_err(|e| e.to_string())?;
        read_limited(&path, SHARE_MAX_BYTES).map(Some)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_file(name: &str, bytes: &[u8]) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("ph-share-{}-{name}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join(name);
        fs::write(&path, bytes).unwrap();
        path
    }

    #[test]
    fn reads_a_small_utf8_file() {
        let path = temp_file("ok.json", "{\"name\":\"코드 점검\"}".as_bytes());
        assert_eq!(
            read_limited(&path, SHARE_MAX_BYTES).unwrap(),
            "{\"name\":\"코드 점검\"}"
        );
    }

    #[test]
    fn refuses_a_file_over_the_limit() {
        let path = temp_file("big.json", &[b'x'; 11]);
        assert_eq!(
            read_limited(&path, 10),
            Err("파일이 너무 커요. 1MB 이하 파일만 가져올 수 있어요.".into())
        );
    }

    #[test]
    fn refuses_a_file_that_is_not_text() {
        let path = temp_file("bin.json", &[0xff, 0xfe, 0x00]);
        assert_eq!(
            read_limited(&path, SHARE_MAX_BYTES),
            Err("텍스트 파일이 아니에요.".into())
        );
    }

    #[test]
    fn drops_a_byte_order_mark() {
        // Windows Notepad saves one; JSON.parse would reject the file.
        let path = temp_file("bom.json", "\u{feff}{}".as_bytes());
        assert_eq!(read_limited(&path, SHARE_MAX_BYTES).unwrap(), "{}");
    }

    #[test]
    fn writes_what_it_is_given() {
        let path = temp_file("out.json", b"old");
        write_share(&path, "new 내용").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "new 내용");
    }
}
