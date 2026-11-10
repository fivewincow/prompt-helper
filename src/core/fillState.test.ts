import { describe, expect, test } from "vitest";
import { draftOf, fillReducer, remainingBlanks, type FillEvent, type FillState, type KeyInput } from "./fillState";
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

describe("blanks are tracked by position (Review I3)", () => {
  const open = (t: string) => fillReducer(null, { type: "open", templateId: "x", title: "T", text: t }, "mac").state!;

  test("a pasted `{}` (empty JSON object) is not counted or visited", () => {
    const s = open("{a} {}");
    const e = fillReducer(s, { type: "edit", text: "x {} {}", selection: { start: 4, end: 4 } }, "mac").state!;
    expect(remainingBlanks(e)).toBe(1);
    const tab = fillReducer({ ...e, selection: { start: 0, end: 0 } }, k("Tab"), "mac");
    expect(tab.effect).toEqual({ type: "select", range: { start: 5, end: 7 } });
  });

  test("typing before a blank shifts it; typing inside a blank fills it", () => {
    const s = open("{a} {b}");
    const before = fillReducer(s, { type: "edit", text: "zz{a} {b}", selection: { start: 2, end: 2 } }, "mac").state!;
    expect(before.blanks).toEqual([
      { start: 2, end: 5 },
      { start: 6, end: 9 },
    ]);
    const inside = fillReducer(before, { type: "edit", text: "zz{xa} {b}", selection: { start: 4, end: 4 } }, "mac").state!;
    expect(inside.blanks).toEqual([{ start: 7, end: 10 }]);
  });

  test("an inserted phrase shifts later blanks and adds its own", () => {
    const s = { ...open("{a} {b}"), selection: { start: 4, end: 4 } };
    const r = fillReducer(s, { type: "insertPhrase", text: "{c} " }, "mac").state!;
    expect(r.text).toBe("{a} {c} {b}");
    expect(r.blanks).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
      { start: 8, end: 11 },
    ]);
  });
});

describe("drafts", () => {
  const draft = { text: "## 목표\n로그인 — 이유: {왜}", blanks: [{ start: 16, end: 19 }], selection: { start: 16, end: 19 } };

  test("opening a template with a draft continues where the user left off", () => {
    const r = fillReducer(null, { type: "open", templateId: "feature", title: "T", text, draft }, "mac");
    expect(r.state!.text).toBe(draft.text);
    expect(r.state!.blanks).toEqual(draft.blanks);
    expect(r.state!.initial).toBe(text);
    expect(r.state!.restored).toBe(true);
    expect(r.effect).toEqual({ type: "select", range: draft.selection });
  });

  test("editing a restored draft hides the restored notice", () => {
    const r = fillReducer(null, { type: "open", templateId: "feature", title: "T", text, draft }, "mac");
    const e = fillReducer(r.state, { type: "edit", text: draft.text + "!", selection: { start: 0, end: 0 } }, "mac");
    expect(e.state!.restored).toBe(false);
  });

  test("the switch prompt opens the other template with its own draft", () => {
    const p = fillReducer(editedState, { type: "open", templateId: "bugfix", title: "B", text: "{x}", draft }, "mac");
    expect(fillReducer(p.state, k("Enter"), "mac").state!.text).toBe(draft.text);
  });

  test("the hotkey of the template being written keeps the writing", () => {
    const r = fillReducer(editedState, { type: "open", templateId: "feature", title: "T", text }, "mac");
    expect(r.state).toBe(editedState);
    expect(r.effect).toEqual({ type: "none" });
  });

  test("draftOf keeps edited text and nothing for untouched text", () => {
    expect(draftOf(editedState)).toEqual({ text: filled, blanks: editedState.blanks, selection: editedState.selection });
    expect(draftOf(opened.state!)).toBeNull();
  });
});

describe("reset to the template (Cmd+R)", () => {
  test("asks first when the text was edited; Enter resets", () => {
    const ask = fillReducer(editedState, k("r", { metaKey: true }), "mac");
    expect(ask.state!.pendingReset).toBe(true);
    expect(ask.state!.text).toBe(filled);
    const reset = fillReducer(ask.state, k("Enter"), "mac");
    expect(reset.state!.text).toBe(text);
    expect(reset.state!.blanks).toEqual(findPlaceholders(text));
    expect(reset.state!.pendingReset).toBe(false);
    expect(reset.effect).toEqual({ type: "select", range: findPlaceholders(text)[0] });
  });

  test("Escape cancels the reset and keeps the window open", () => {
    const ask = fillReducer(editedState, k("r", { metaKey: true }), "mac");
    const kept = fillReducer(ask.state, k("Escape"), "mac");
    expect(kept.state!.pendingReset).toBe(false);
    expect(kept.state!.text).toBe(filled);
  });

  test("untouched text just goes back to the first blank", () => {
    const r = fillReducer(onSecond.state, k("r", { metaKey: true }), "mac");
    expect(r.state!.pendingReset).toBe(false);
    expect(r.effect).toEqual({ type: "select", range: findPlaceholders(text)[0] });
  });

  test("works with a Korean input source (key is a Hangul letter, code is KeyR)", () => {
    expect(fillReducer(editedState, k("ㄱ", { metaKey: true, code: "KeyR" }), "mac").state!.pendingReset).toBe(true);
  });
});

describe("direct switch (a template chosen from the menu)", () => {
  test("switches without asking", () => {
    const r = fillReducer(editedState, { type: "open", templateId: "bugfix", title: "B", text: "{x}", direct: true }, "mac");
    expect(r.state!.templateId).toBe("bugfix");
    expect(r.state!.pendingReplace).toBeNull();
  });
});
