//! Reads and writes the app's single data file (`data.json` in the app data folder).

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Manager};

const DATA_FILE: &str = "data.json";

/// Writes `<name>.tmp`, then renames it over `<name>`.
/// A rename on the same volume is atomic, so if the app quits or the machine loses power
/// mid-write, the user is left with either the old file or the new one, never a torn file.
pub fn write_atomic(dir: &Path, name: &str, contents: &str) -> std::io::Result<()> {
    let tmp = dir.join(format!("{name}.tmp"));
    fs::write(&tmp, contents)?;
    fs::rename(&tmp, dir.join(name))
}

/// Moves an unreadable `<stem>.<ext>` aside as `<stem>.corrupt-<now_secs>.<ext>` so the app
/// can start fresh without destroying what the user had. Returns the new path, or None if
/// there was no file.
pub fn backup_file(dir: &Path, name: &str, now_secs: u64) -> std::io::Result<Option<PathBuf>> {
    let src = dir.join(name);
    if !src.exists() {
        return Ok(None);
    }
    let path = Path::new(name);
    let stem = path.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default();
    let ext = path
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();
    let dest = dir.join(format!("{stem}.corrupt-{now_secs}{ext}"));
    fs::rename(&src, &dest)?;
    Ok(Some(dest))
}

/// The app data folder, created on first use.
fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Returns the raw file contents, or None on first run (no file yet). Parsing happens in TS.
#[tauri::command]
pub fn load_data(app: AppHandle) -> Result<Option<String>, String> {
    match fs::read_to_string(data_dir(&app)?.join(DATA_FILE)) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn save_data(app: AppHandle, json: String) -> Result<(), String> {
    write_atomic(&data_dir(&app)?, DATA_FILE, &json).map_err(|e| e.to_string())
}

/// Called by TS when data.json cannot be parsed. Returns the backup's file name.
#[tauri::command]
pub fn backup_data(app: AppHandle) -> Result<Option<String>, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let moved = backup_file(&data_dir(&app)?, DATA_FILE, now).map_err(|e| e.to_string())?;
    Ok(moved.and_then(|p| p.file_name().map(|n| n.to_string_lossy().into_owned())))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A fresh, unique scratch folder under the system temp dir.
    fn temp_dir(tag: &str) -> PathBuf {
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let dir = std::env::temp_dir().join(format!("prompt-helper-test-{tag}-{nanos}"));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn write_atomic_writes_contents_and_leaves_no_temp_file() {
        let dir = temp_dir("write");
        write_atomic(&dir, "data.json", "{\"a\":1}").unwrap();
        assert_eq!(fs::read_to_string(dir.join("data.json")).unwrap(), "{\"a\":1}");
        assert!(!dir.join("data.json.tmp").exists());
    }

    #[test]
    fn write_atomic_overwrites() {
        let dir = temp_dir("overwrite");
        write_atomic(&dir, "data.json", "first").unwrap();
        write_atomic(&dir, "data.json", "second").unwrap();
        assert_eq!(fs::read_to_string(dir.join("data.json")).unwrap(), "second");
    }

    #[test]
    fn backup_file_returns_none_when_missing() {
        let dir = temp_dir("missing");
        assert_eq!(backup_file(&dir, "data.json", 123).unwrap(), None);
    }

    #[test]
    fn backup_file_renames_with_timestamp() {
        let dir = temp_dir("backup");
        fs::write(dir.join("data.json"), "{broken").unwrap();
        let moved = backup_file(&dir, "data.json", 123).unwrap();
        assert_eq!(moved, Some(dir.join("data.corrupt-123.json")));
        assert!(!dir.join("data.json").exists());
        assert_eq!(fs::read_to_string(dir.join("data.corrupt-123.json")).unwrap(), "{broken");
    }
}
