//! Remembers which app should receive a paste and brings it back to the front.
//!
//! When a hotkey fires, the app the user was typing in is in front. We remember it, because
//! our own overlay window may take focus in between (fill window, palette), and the paste
//! must go back to where the user was.

use std::sync::Mutex;
use std::thread::sleep;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager, State};

/// The paste target: a process id on macOS, a window handle on Windows.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FocusTarget(pub i64);

/// Managed state. `None` means "no outside app": the user was in one of our own windows,
/// so the paste goes wherever focus already is.
pub struct RememberedTarget(pub Mutex<Option<FocusTarget>>);

/// How long to wait for the target app to come to the front before pasting anyway.
const ACTIVATE_WAIT_MAX_MS: u64 = 500;

pub fn remember(app: &AppHandle) {
    if let Some(state) = app.try_state::<RememberedTarget>() {
        *state.0.lock().unwrap() = frontmost();
    }
}

#[tauri::command]
pub fn remember_frontmost(state: State<RememberedTarget>) {
    *state.0.lock().unwrap() = frontmost();
}

/// Activates `t` and waits until it is actually in front, so the paste keystroke lands there.
pub fn activate_and_wait(t: &FocusTarget) -> bool {
    if raw_frontmost() == Some(*t) {
        return true;
    }
    activate(t);
    let start = Instant::now();
    while start.elapsed() < Duration::from_millis(ACTIVATE_WAIT_MAX_MS) {
        if raw_frontmost() == Some(*t) {
            return true;
        }
        sleep(Duration::from_millis(10));
    }
    false
}

// ---------------------------------------------------------------- macOS

#[cfg(target_os = "macos")]
fn raw_frontmost() -> Option<FocusTarget> {
    use objc2_app_kit::NSWorkspace;
    let app = NSWorkspace::sharedWorkspace().frontmostApplication()?;
    Some(FocusTarget(i64::from(app.processIdentifier())))
}

/// The frontmost app, or None when that is this app itself.
#[cfg(target_os = "macos")]
pub fn frontmost() -> Option<FocusTarget> {
    use objc2_app_kit::NSRunningApplication;
    let own = i64::from(NSRunningApplication::currentApplication().processIdentifier());
    raw_frontmost().filter(|t| t.0 != own)
}

#[cfg(target_os = "macos")]
pub fn activate(t: &FocusTarget) -> bool {
    use objc2_app_kit::{NSApplicationActivationOptions, NSRunningApplication};
    let Ok(pid) = i32::try_from(t.0) else { return false };
    let Some(app) = NSRunningApplication::runningApplicationWithProcessIdentifier(pid) else {
        return false;
    };
    app.activateWithOptions(NSApplicationActivationOptions::empty())
}

// ---------------------------------------------------------------- Windows (not run-verified)

#[cfg(target_os = "windows")]
mod win {
    use std::sync::atomic::{AtomicIsize, Ordering};

    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Threading::GetCurrentProcessId;
    use windows::Win32::UI::Accessibility::{SetWinEventHook, HWINEVENTHOOK};
    use windows::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetForegroundWindow, GetWindowThreadProcessId, SetForegroundWindow,
        EVENT_SYSTEM_FOREGROUND, WINEVENT_OUTOFCONTEXT,
    };

    /// Last foreground window that is neither ours nor the taskbar. Clicking the tray icon
    /// makes the taskbar the foreground window, so the real target has to be tracked ahead.
    static LAST: AtomicIsize = AtomicIsize::new(0);

    fn is_candidate(hwnd: HWND) -> bool {
        if hwnd.0.is_null() {
            return false;
        }
        let mut pid = 0u32;
        // SAFETY: plain Win32 queries on a window handle; a stale handle just returns 0.
        unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
        if pid == unsafe { GetCurrentProcessId() } {
            return false;
        }
        let mut buf = [0u16; 64];
        let n = unsafe { GetClassNameW(hwnd, &mut buf) };
        let class = String::from_utf16_lossy(&buf[..n.max(0) as usize]);
        class != "Shell_TrayWnd" && class != "NotifyIconOverflowWindow"
    }

    unsafe extern "system" fn on_foreground(
        _hook: HWINEVENTHOOK,
        _event: u32,
        hwnd: HWND,
        _id_object: i32,
        _id_child: i32,
        _thread: u32,
        _time: u32,
    ) {
        if is_candidate(hwnd) {
            LAST.store(hwnd.0 as isize, Ordering::Relaxed);
        }
    }

    /// Must run on the thread that pumps messages (Tauri's main thread), or no events arrive.
    pub fn install_tracking() {
        // SAFETY: registers an out-of-context hook; the callback only stores an integer.
        unsafe {
            let fg = GetForegroundWindow();
            if is_candidate(fg) {
                LAST.store(fg.0 as isize, Ordering::Relaxed);
            }
            let _ = SetWinEventHook(
                EVENT_SYSTEM_FOREGROUND,
                EVENT_SYSTEM_FOREGROUND,
                None,
                Some(on_foreground),
                0,
                0,
                WINEVENT_OUTOFCONTEXT,
            );
        }
    }

    pub fn raw_foreground() -> isize {
        unsafe { GetForegroundWindow() }.0 as isize
    }

    pub fn current_or_last() -> Option<isize> {
        let fg = unsafe { GetForegroundWindow() };
        if is_candidate(fg) {
            return Some(fg.0 as isize);
        }
        let v = LAST.load(Ordering::Relaxed);
        (v != 0).then_some(v)
    }

    /// Windows only lets a process take the foreground in some cases (it received the last
    /// input event, e.g. our hotkey, or it is already foreground). Outside those, this fails
    /// and the window just flashes in the taskbar.
    pub fn activate(h: isize) -> bool {
        unsafe { SetForegroundWindow(HWND(h as *mut _)) }.as_bool()
    }
}

#[cfg(target_os = "windows")]
pub use win::install_tracking;

#[cfg(target_os = "windows")]
fn raw_frontmost() -> Option<FocusTarget> {
    Some(FocusTarget(win::raw_foreground() as i64))
}

#[cfg(target_os = "windows")]
pub fn frontmost() -> Option<FocusTarget> {
    win::current_or_last().map(|h| FocusTarget(h as i64))
}

#[cfg(target_os = "windows")]
pub fn activate(t: &FocusTarget) -> bool {
    win::activate(t.0 as isize)
}
