import { describe, expect, test } from "vitest";
import {
  acceleratorFromKeyEvent,
  DEFAULT_BINDINGS,
  detectPlatform,
  findConflicts,
  formatAccelerator,
  isPrimaryMod,
} from "./hotkeys";
import type { ActionId } from "./types";

const ev = (code: string, m: Partial<Record<"ctrlKey" | "altKey" | "shiftKey" | "metaKey", boolean>> = {}) => ({
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...m,
});

describe("acceleratorFromKeyEvent", () => {
  test("records Control+Alt+P in canonical form", () => {
    expect(acceleratorFromKeyEvent(ev("KeyP", { ctrlKey: true, altKey: true }))).toBe("Control+Alt+KeyP");
  });

  test("rejects a key without a modifier", () => {
    expect(acceleratorFromKeyEvent(ev("KeyA"))).toBeNull();
  });

  test("rejects Shift alone because it just types a capital letter", () => {
    expect(acceleratorFromKeyEvent(ev("KeyA", { shiftKey: true }))).toBeNull();
  });

  test("rejects a bare modifier key press", () => {
    expect(acceleratorFromKeyEvent(ev("AltLeft", { altKey: true }))).toBeNull();
  });
});

describe("formatAccelerator", () => {
  test("mac uses symbols", () => {
    expect(formatAccelerator("Control+Alt+Digit2", "mac")).toBe("⌃⌥2");
  });

  test("windows uses words joined by +", () => {
    expect(formatAccelerator("Control+Alt+Digit2", "windows")).toBe("Ctrl+Alt+2");
  });

  test("mac symbol order is ⌃⌥⇧⌘", () => {
    expect(formatAccelerator("Super+Shift+KeyK", "mac")).toBe("⇧⌘K");
  });
});

describe("findConflicts", () => {
  test("flags a key already bound to another action", () => {
    expect(findConflicts("Control+Alt+Digit2", "template:test", DEFAULT_BINDINGS, [], "mac")).toEqual([
      { kind: "internal", detail: "template:feature" },
    ]);
  });

  test("does not flag the action's own key", () => {
    expect(findConflicts("Control+Alt+Digit2", "template:feature", DEFAULT_BINDINGS, [], "mac")).toEqual([]);
  });

  test("flags an enabled system shortcut", () => {
    expect(findConflicts("Control+Alt+Space", "palette", DEFAULT_BINDINGS, ["Control+Alt+Space"], "mac")[0].kind).toBe(
      "system",
    );
  });

  test("flags a common app shortcut", () => {
    expect(findConflicts("Super+Alt+Digit1", "palette", DEFAULT_BINDINGS, [], "mac")[0].kind).toBe("common");
  });

  test("default bindings have no conflicts on either platform", () => {
    for (const p of ["mac", "windows"] as const)
      for (const [id, acc] of Object.entries(DEFAULT_BINDINGS))
        expect(findConflicts(acc, id as ActionId, DEFAULT_BINDINGS, [], p)).toEqual([]);
  });
});

test("detectPlatform reads the user agent", () => {
  expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("mac");
  expect(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("windows");
});

test("isPrimaryMod is Command on mac and Ctrl on windows", () => {
  expect(isPrimaryMod({ metaKey: true, ctrlKey: false }, "mac")).toBe(true);
  expect(isPrimaryMod({ metaKey: false, ctrlKey: true }, "mac")).toBe(false);
  expect(isPrimaryMod({ metaKey: false, ctrlKey: true }, "windows")).toBe(true);
});
