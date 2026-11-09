/** Event names and typed listen/emit helpers shared by the overlay, editor and toast windows. */
import { emit, listen } from "@tauri-apps/api/event";
import type { EditorTab, RegistrationFailure } from "./commands";

export const EVENTS = {
  shortcut: "shortcut-triggered",
  dataChanged: "data-changed",
  registrationResult: "registration-result",
  toast: "toast-message",
  editorTab: "editor-tab",
  recording: "hotkey-recording",
  editorClosed: "editor-closed",
} as const;

export type DataSource = "controller" | "editor";

export const onShortcut = (cb: (actionId: string) => void) =>
  listen<{ actionId: string }>(EVENTS.shortcut, (e) => cb(e.payload.actionId));

export const onDataChanged = (cb: (p: { source: DataSource }) => void) =>
  listen<{ source: DataSource }>(EVENTS.dataChanged, (e) => cb(e.payload));

export const emitDataChanged = (p: { source: DataSource }) => emit(EVENTS.dataChanged, p);

export const onRegistrationResult = (cb: (failures: RegistrationFailure[]) => void) =>
  listen<{ failures: RegistrationFailure[] }>(EVENTS.registrationResult, (e) => cb(e.payload.failures));

export const emitRegistrationResult = (failures: RegistrationFailure[]) =>
  emit(EVENTS.registrationResult, { failures });

export const onToastMessage = (cb: (message: string) => void) => listen<string>(EVENTS.toast, (e) => cb(e.payload));

export const onEditorTab = (cb: (tab: EditorTab) => void) => listen<EditorTab>(EVENTS.editorTab, (e) => cb(e.payload));

/** The editor is recording a hotkey: the controller pauses all hotkeys so the keys reach the recorder. */
export const emitRecording = (active: boolean) => emit(EVENTS.recording, active);

export const onRecording = (cb: (active: boolean) => void) => listen<boolean>(EVENTS.recording, (e) => cb(e.payload));

/** Rust tells the overlay when the editor window is gone (it may have closed mid-recording). */
export const onEditorClosed = (cb: () => void) => listen(EVENTS.editorClosed, () => cb());
