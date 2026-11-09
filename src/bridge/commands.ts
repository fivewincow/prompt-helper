/**
 * Typed wrappers around the Rust commands. Each name maps to a snake_case command in src-tauri.
 * Commands added by later tasks are declared here up front so callers have one place to look.
 */
import { invoke } from "@tauri-apps/api/core";
import type { Binding } from "../core/types";

export interface RegistrationFailure {
  actionId: string;
  accelerator: string;
  message: string;
}

export type PasteOutcome = "pasted" | "copiedOnly";
export type EditorTab = "templates" | "phrases" | "settings";

export const loadData = () => invoke<string | null>("load_data");
export const saveData = (json: string) => invoke<void>("save_data", { json });
export const backupData = () => invoke<string | null>("backup_data");
export const readSystemShortcuts = () => invoke<string[]>("read_system_shortcuts");
export const checkAccessibility = () => invoke<boolean>("check_accessibility");
export const openAccessibilitySettings = () => invoke<void>("open_accessibility_settings");
export const rememberFrontmost = () => invoke<void>("remember_frontmost");
export const restoreFocus = () => invoke<void>("restore_focus");
export const pasteText = (text: string) => invoke<PasteOutcome>("paste_text", { text });
export const setShortcuts = (bindings: Binding[]) => invoke<RegistrationFailure[]>("set_shortcuts", { bindings });
export const showOverlay = (view: "palette" | "fill") => invoke<void>("show_overlay", { view });
export const hideOverlay = () => invoke<void>("hide_overlay");
export const openEditor = (tab?: EditorTab) => invoke<void>("open_editor", { tab: tab ?? null });
export const showToast = (message: string) => invoke<void>("show_toast", { message });
export const quitApp = () => invoke<void>("quit_app");
