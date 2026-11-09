import type { ActionId, Platform, Settings } from "./types";

/*
 * Canonical accelerator: modifiers in the order Control, Alt, Shift, Super, then a
 * KeyboardEvent.code ("KeyP", "Digit1", "Space"), joined by "+". The same string is
 * passed unchanged to the Rust global-shortcut plugin.
 */

export const DEFAULT_BINDINGS: Record<ActionId, string> = {
  "template:plan-doc": "Control+Alt+Digit1",
  "template:feature": "Control+Alt+Digit2",
  "template:test": "Control+Alt+Digit3",
  "template:bugfix": "Control+Alt+Digit4",
  "template:research": "Control+Alt+Digit5",
  palette: "Control+Alt+KeyP",
  cycleMode: "Control+Alt+KeyM",
};

const MODIFIER_ORDER = ["Control", "Alt", "Shift", "Super"] as const;
type Modifier = (typeof MODIFIER_ORDER)[number];

const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "ShiftLeft",
  "ShiftRight",
  "MetaLeft",
  "MetaRight",
  "CapsLock",
  "Fn",
]);

export function acceleratorFromKeyEvent(e: {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}): string | null {
  if (MODIFIER_CODES.has(e.code)) return null;
  // Shift alone only types a capital letter, so it cannot make a global hotkey.
  if (!e.ctrlKey && !e.altKey && !e.metaKey) return null;
  const mods: Modifier[] = [];
  if (e.ctrlKey) mods.push("Control");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  if (e.metaKey) mods.push("Super");
  return [...mods, e.code].join("+");
}

const MAC_SYMBOLS: Record<Modifier, string> = { Control: "⌃", Alt: "⌥", Shift: "⇧", Super: "⌘" };
const WINDOWS_NAMES: Record<Modifier, string> = { Control: "Ctrl", Alt: "Alt", Shift: "Shift", Super: "Win" };

function displayKey(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

export function formatAccelerator(acc: string, platform: Platform): string {
  const parts = acc.split("+");
  const key = parts[parts.length - 1];
  const mods = MODIFIER_ORDER.filter((m) => parts.slice(0, -1).includes(m));
  if (platform === "mac") return mods.map((m) => MAC_SYMBOLS[m]).join("") + displayKey(key);
  return [...mods.map((m) => WINDOWS_NAMES[m]), displayKey(key)].join("+");
}

export type ConflictKind = "internal" | "system" | "common" | "registration";

export interface Conflict {
  kind: ConflictKind;
  detail: string;
}

export const COMMON_SHORTCUTS: Record<Platform, readonly string[]> = {
  mac: [
    "Super+KeyC",
    "Super+KeyV",
    "Super+KeyX",
    "Super+KeyZ",
    "Super+KeyA",
    "Super+KeyS",
    "Super+KeyQ",
    "Super+KeyW",
    "Super+KeyT",
    "Super+KeyN",
    "Super+Space",
    "Super+Tab",
    // Heading shortcuts in Google Docs and Notion.
    "Alt+Super+Digit1",
    "Alt+Super+Digit2",
    "Alt+Super+Digit3",
    "Alt+Space",
    "Control+Space",
  ],
  windows: [
    "Control+KeyC",
    "Control+KeyV",
    "Control+KeyX",
    "Control+KeyZ",
    "Control+KeyA",
    "Control+KeyS",
    "Alt+Space",
    "Alt+Tab",
    "Alt+F4",
    "Super+KeyL",
    "Super+KeyD",
    "Super+KeyE",
    "Control+Alt+Delete",
  ],
};

/** Puts modifiers into canonical order so "Super+Alt+Digit1" and "Alt+Super+Digit1" compare equal. */
function normalize(acc: string): string {
  const parts = acc.split("+");
  const key = parts[parts.length - 1];
  const mods = MODIFIER_ORDER.filter((m) => parts.slice(0, -1).includes(m));
  return [...mods, key].join("+");
}

export function findConflicts(
  acc: string,
  forAction: ActionId,
  bindings: Settings["bindings"],
  systemShortcuts: readonly string[],
  platform: Platform,
): Conflict[] {
  const target = normalize(acc);
  const conflicts: Conflict[] = [];
  for (const [action, bound] of Object.entries(bindings)) {
    if (action !== forAction && bound && normalize(bound) === target) conflicts.push({ kind: "internal", detail: action });
  }
  if (systemShortcuts.some((s) => normalize(s) === target)) conflicts.push({ kind: "system", detail: target });
  if (COMMON_SHORTCUTS[platform].some((s) => normalize(s) === target)) conflicts.push({ kind: "common", detail: target });
  return conflicts;
}

export function detectPlatform(userAgent: string): Platform {
  return /Mac/i.test(userAgent) ? "mac" : "windows";
}

/** The platform's primary shortcut modifier: Command on mac, Ctrl on Windows. */
export function isPrimaryMod(e: { metaKey: boolean; ctrlKey: boolean }, platform: Platform): boolean {
  return platform === "mac" ? e.metaKey : e.ctrlKey;
}
