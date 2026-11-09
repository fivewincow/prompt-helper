import { describe, expect, test } from "vitest";
import { fillReducer, remainingBlanks, type FillEvent, type FillState, type KeyInput } from "./fillState";
import { findPlaceholders } from "./placeholders";

const k = (key: string, m: Partial<KeyInput> = {}): FillEvent => ({
  type: "key",
  input: { key, metaKey: false, ctrlKey: false, shiftKey: false, isComposing: false, ...m },
});

const text = "## 목표\n{무엇을} — 이유: {왜}";
const filled = '## 목표\n로그인 — 이유: {"code":401}';

const opened = fillReducer(null, { type: "open", templateId: "feature", title: "T", text }, "mac");
const onSecond = fillReducer(opened.state, k("Tab"), "mac");
const edited = fillReducer(onSecond.state, { type: "edit", text: filled, selection: { start: 0, end: 0 } }, "mac");
const editedState = edited.state as FillState;

describe("open", () => {
  test("selects the first blank", () => {
    expect(opened.effect).toEqual({ type: "select", range: findPlaceholders(text)[0] });
  });

  test("while editing, another template only asks first (Review Focus 4)", () => {
    const p = fillReducer(editedState, { type: "open", templateId: "bugfix", title: "B", text: "{x}" }, "mac");
    expect(p.state!.text).toBe(filled);
    expect(p.state!.pendingReplace?.templateId).toBe("bugfix");
    expect(fillReducer(p.state, k("Escape"), "mac").state!.text).toBe(filled);
    expect(fillReducer(p.state, k("Enter"), "mac").state!.templateId).toBe("bugfix");
  });

  test("an untouched fill window is replaced directly", () => {
    const p = fillReducer(opened.state, { type: "open", templateId: "bugfix", title: "B", text: "{x}" }, "mac");
    expect(p.state!.templateId).toBe("bugfix");
    expect(p.state!.pendingReplace).toBeNull();
  });
});

describe("keys", () => {
  test("Tab moves to the next blank", () => {
    expect(onSecond.effect).toEqual({ type: "select", range: findPlaceholders(text)[1] });
  });

  test("keys during IME composition do nothing (Review Focus 1)", () => {
    expect(fillReducer(onSecond.state, k("Enter", { metaKey: true, isComposing: true }), "mac")).toEqual({
      state: onSecond.state,
      effect: { type: "none" },
    });
    expect(fillReducer(onSecond.state, k("Tab", { isComposing: true }), "mac").effect).toEqual({ type: "none" });
  });

  test("Cmd+Enter with blanks left warns first, pastes on the second press", () => {
    const w = fillReducer(onSecond.state, k("Enter", { metaKey: true }), "mac");
    expect(w.state!.confirmSubmit).toBe(true);
    expect(w.effect).toEqual({ type: "none" });
    expect(fillReducer(w.state, k("Enter", { metaKey: true }), "mac")).toEqual({
      state: null,
      effect: { type: "paste", text },
    });
  });

  test("pasted JSON braces are not counted as blanks (Review Focus 3)", () => {
    expect(remainingBlanks(editedState)).toBe(0);
    expect(fillReducer(editedState, k("Enter", { metaKey: true }), "mac").effect).toEqual({ type: "paste", text: filled });
  });

  test("Ctrl is the primary modifier on Windows", () => {
    expect(fillReducer(editedState, k("Enter", { ctrlKey: true }), "windows").effect.type).toBe("paste");
    expect(fillReducer(editedState, k("Enter", { ctrlKey: true }), "mac").effect.type).toBe("none");
  });

  test("Escape closes without pasting", () => {
    expect(fillReducer(editedState, k("Escape"), "mac")).toEqual({ state: null, effect: { type: "close" } });
  });

  test("moving the caret updates the selection but keeps a pending blank warning", () => {
    const w = fillReducer(onSecond.state, k("Enter", { metaKey: true }), "mac");
    const moved = fillReducer(w.state, { type: "select", selection: { start: 2, end: 2 } }, "mac");
    expect(moved.state!.selection).toEqual({ start: 2, end: 2 });
    expect(moved.state!.confirmSubmit).toBe(true);
  });

  test("editing clears a pending blank warning", () => {
    const w = fillReducer(onSecond.state, k("Enter", { metaKey: true }), "mac");
    const after = fillReducer(w.state, { type: "edit", text: text + " ", selection: { start: 0, end: 0 } }, "mac");
    expect(after.state!.confirmSubmit).toBe(false);
  });
});

describe("phrase search", () => {
  test("Cmd+K opens it, Escape closes only the search", () => {
    const open = fillReducer(editedState, k("k", { metaKey: true }), "mac");
    expect(open.state!.phraseSearch).toBe(true);
    const closed = fillReducer(open.state, k("Escape"), "mac");
    expect(closed.state!.phraseSearch).toBe(false);
    expect(closed.state!.text).toBe(filled);
  });

  test("Cmd+K works with a Korean input source (key is a Hangul letter, code is KeyK)", () => {
    expect(fillReducer(editedState, k("ㅏ", { metaKey: true, code: "KeyK" }), "mac").state!.phraseSearch).toBe(true);
  });

  test("an inserted phrase adds its blanks to the known set", () => {
    const open = fillReducer(editedState, k("k", { metaKey: true }), "mac");
    const s = fillReducer(open.state, { type: "insertPhrase", text: "{테스트 명령} 실행 후 명령과 결과를 보고해줘" }, "mac");
    expect(s.state!.phraseSearch).toBe(false);
    expect(s.state!.text.startsWith("{테스트 명령} 실행 후")).toBe(true);
    expect(remainingBlanks(s.state!)).toBe(1);
  });
});
