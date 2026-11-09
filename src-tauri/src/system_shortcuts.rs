//! Reads the user's enabled macOS system shortcuts (System Settings > Keyboard > Shortcuts)
//! so the editor can warn before a hotkey collides with one of them. macOS does not report
//! these as conflicts when another app registers the same keys, so we read them ourselves.

use plist::Value;

// Modifier bits in com.apple.symbolichotkeys.plist (same as NSEvent modifier flags).
const SHIFT: u64 = 0x20000;
const CONTROL: u64 = 0x40000;
const OPTION: u64 = 0x80000;
const COMMAND: u64 = 0x100000;

/// macOS virtual keycode → KeyboardEvent.code. Only keys our hotkeys can use are listed.
fn code_for_keycode(keycode: u16) -> Option<&'static str> {
    Some(match keycode {
        49 => "Space",
        0 => "KeyA",
        1 => "KeyS",
        2 => "KeyD",
        3 => "KeyF",
        4 => "KeyH",
        5 => "KeyG",
        6 => "KeyZ",
        7 => "KeyX",
        8 => "KeyC",
        9 => "KeyV",
        11 => "KeyB",
        12 => "KeyQ",
        13 => "KeyW",
        14 => "KeyE",
        15 => "KeyR",
        16 => "KeyY",
        17 => "KeyT",
        31 => "KeyO",
        32 => "KeyU",
        34 => "KeyI",
        35 => "KeyP",
        37 => "KeyL",
        38 => "KeyJ",
        40 => "KeyK",
        45 => "KeyN",
        46 => "KeyM",
        18 => "Digit1",
        19 => "Digit2",
        20 => "Digit3",
        21 => "Digit4",
        22 => "Digit6",
        23 => "Digit5",
        25 => "Digit9",
        26 => "Digit7",
        28 => "Digit8",
        29 => "Digit0",
        _ => return None,
    })
}

/// Builds the canonical accelerator (Control, Alt, Shift, Super order) used by the TS side.
pub fn accelerator_from_symbolic(keycode: u16, modifier_mask: u64) -> Option<String> {
    let key = code_for_keycode(keycode)?;
    let mut parts: Vec<&str> = Vec::new();
    for (bit, name) in [
        (CONTROL, "Control"),
        (OPTION, "Alt"),
        (SHIFT, "Shift"),
        (COMMAND, "Super"),
    ] {
        if modifier_mask & bit != 0 {
            parts.push(name);
        }
    }
    parts.push(key);
    Some(parts.join("+"))
}

fn as_u64(v: &Value) -> Option<u64> {
    v.as_unsigned_integer()
        .or_else(|| v.as_signed_integer().and_then(|n| u64::try_from(n).ok()))
}

/// Enabled entries look like `AppleSymbolicHotKeys.<id> = { enabled, value.parameters = [ascii, keycode, mask] }`.
pub fn parse_symbolic_hotkeys(plist_bytes: &[u8]) -> Vec<String> {
    let Ok(root) = Value::from_reader(std::io::Cursor::new(plist_bytes)) else {
        return Vec::new();
    };
    let Some(keys) = root
        .as_dictionary()
        .and_then(|d| d.get("AppleSymbolicHotKeys"))
        .and_then(Value::as_dictionary)
    else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for entry in keys.values() {
        let Some(e) = entry.as_dictionary() else {
            continue;
        };
        let enabled = match e.get("enabled") {
            Some(Value::Boolean(b)) => *b,
            Some(v) => as_u64(v).is_some_and(|n| n != 0),
            None => false,
        };
        if !enabled {
            continue;
        }
        let Some(params) = e
            .get("value")
            .and_then(Value::as_dictionary)
            .and_then(|v| v.get("parameters"))
            .and_then(Value::as_array)
        else {
            continue;
        };
        if params.len() != 3 {
            continue;
        }
        let (Some(keycode), Some(mask)) = (as_u64(&params[1]), as_u64(&params[2])) else {
            continue;
        };
        let Ok(keycode) = u16::try_from(keycode) else {
            continue;
        };
        if let Some(acc) = accelerator_from_symbolic(keycode, mask) {
            out.push(acc);
        }
    }
    out
}

/// macOS: the enabled system shortcuts as canonical accelerators. Windows: none can be read.
#[tauri::command]
pub fn read_system_shortcuts() -> Vec<String> {
    #[cfg(target_os = "macos")]
    {
        let Ok(home) = std::env::var("HOME") else {
            return Vec::new();
        };
        let path =
            std::path::Path::new(&home).join("Library/Preferences/com.apple.symbolichotkeys.plist");
        std::fs::read(path)
            .map(|b| parse_symbolic_hotkeys(&b))
            .unwrap_or_default()
    }
    #[cfg(not(target_os = "macos"))]
    {
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use plist::{Dictionary, Value};

    fn entry(enabled: bool, params: Option<[i64; 3]>) -> Value {
        let mut e = Dictionary::new();
        e.insert("enabled".into(), Value::Boolean(enabled));
        if let Some(p) = params {
            let mut v = Dictionary::new();
            v.insert(
                "parameters".into(),
                Value::Array(p.iter().map(|n| Value::Integer((*n).into())).collect()),
            );
            v.insert("type".into(), Value::String("standard".into()));
            e.insert("value".into(), Value::Dictionary(v));
        }
        Value::Dictionary(e)
    }

    fn fixture() -> Vec<u8> {
        let mut keys = Dictionary::new();
        keys.insert("61".into(), entry(true, Some([32, 49, 786432])));
        keys.insert("60".into(), entry(false, Some([32, 49, 262144])));
        keys.insert("99".into(), entry(true, None));
        let mut root = Dictionary::new();
        root.insert("AppleSymbolicHotKeys".into(), Value::Dictionary(keys));
        let mut bytes = Vec::new();
        Value::Dictionary(root)
            .to_writer_binary(&mut bytes)
            .unwrap();
        bytes
    }

    #[test]
    fn control_option_space() {
        assert_eq!(
            accelerator_from_symbolic(49, 0x40000 | 0x80000).as_deref(),
            Some("Control+Alt+Space")
        );
    }

    #[test]
    fn control_option_p() {
        assert_eq!(
            accelerator_from_symbolic(35, 0x40000 | 0x80000).as_deref(),
            Some("Control+Alt+KeyP")
        );
    }

    #[test]
    fn command_digit() {
        assert_eq!(
            accelerator_from_symbolic(18, 0x100000).as_deref(),
            Some("Super+Digit1")
        );
    }

    #[test]
    fn unknown_keycode_is_skipped() {
        assert_eq!(accelerator_from_symbolic(200, 0x40000), None);
    }

    #[test]
    fn only_enabled_entries_with_parameters() {
        assert_eq!(
            parse_symbolic_hotkeys(&fixture()),
            vec!["Control+Alt+Space".to_string()]
        );
    }

    #[test]
    fn garbage_bytes_give_an_empty_list() {
        assert!(parse_symbolic_hotkeys(b"not a plist").is_empty());
    }

    /// Manual check against this machine's real settings: `cargo test -- --ignored --nocapture`.
    #[test]
    #[ignore]
    fn reads_this_machines_settings() {
        println!("system shortcuts: {:?}", read_system_shortcuts());
    }
}
