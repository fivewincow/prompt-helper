import { isPrimaryMod } from "./hotkeys";
import { findPlaceholders, nextPlaceholder, placeholderSet, type Range } from "./placeholders";
import type { Platform } from "./types";

/** The parts of a KeyboardEvent the fill window and palette react to. */
export interface KeyInput {
  key: string;
  /** Physical key; used for shortcuts so they work under a Korean input source too. */
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  isComposing: boolean;
}

export interface FillState {
  templateId: string;
  title: string;
  initial: string;
  text: string;
  /** Blanks of the template as opened, plus those of inserted phrases. Only these count as unfilled. */
  known: Set<string>;
  selection: Range;
  confirmSubmit: boolean;
  pendingReplace: { templateId: string; title: string; text: string } | null;
  phraseSearch: boolean;
}

export type FillEvent =
  | { type: "open"; templateId: string; title: string; text: string }
  | { type: "edit"; text: string; selection: Range }
  | { type: "select"; selection: Range }
  | { type: "key"; input: KeyInput }
  | { type: "insertPhrase"; text: string }
  | { type: "confirmReplace" }
  | { type: "cancelReplace" };

export type FillEffect =
  | { type: "none" }
  | { type: "select"; range: Range }
  | { type: "paste"; text: string }
  | { type: "close" };

type Result = { state: FillState | null; effect: FillEffect };

const none = (state: FillState | null): Result => ({ state, effect: { type: "none" } });

export function remainingBlanks(s: FillState): number {
  return findPlaceholders(s.text, s.known).length;
}

function openFresh(o: { templateId: string; title: string; text: string }): Result {
  const known = placeholderSet(o.text);
  const first = findPlaceholders(o.text, known)[0] ?? { start: o.text.length, end: o.text.length };
  return {
    state: {
      templateId: o.templateId,
      title: o.title,
      initial: o.text,
      text: o.text,
      known,
      selection: first,
      confirmSubmit: false,
      pendingReplace: null,
      phraseSearch: false,
    },
    effect: { type: "select", range: first },
  };
}

function isKey(input: KeyInput, letter: string): boolean {
  return input.key.toLowerCase() === letter || input.code === `Key${letter.toUpperCase()}`;
}

function onKey(s: FillState, input: KeyInput, platform: Platform): Result {
  // Keys pressed while an IME (e.g. Korean) is composing only finish the composition.
  if (input.isComposing) return none(s);

  if (s.pendingReplace) {
    if (input.key === "Enter") return openFresh(s.pendingReplace);
    if (input.key === "Escape") return none({ ...s, pendingReplace: null });
    return none(s);
  }

  const primary = isPrimaryMod(input, platform);

  if (input.key === "Tab") {
    const dir = input.shiftKey ? -1 : 1;
    const from = dir === 1 ? s.selection.end : s.selection.start;
    const r = nextPlaceholder(s.text, from, dir, s.known);
    return r ? { state: { ...s, selection: r }, effect: { type: "select", range: r } } : none(s);
  }

  if (primary && input.key === "Enter") {
    if (remainingBlanks(s) > 0 && !s.confirmSubmit) return none({ ...s, confirmSubmit: true });
    return { state: null, effect: { type: "paste", text: s.text } };
  }

  if (primary && isKey(input, "k")) return none({ ...s, phraseSearch: true });

  if (input.key === "Escape") {
    if (s.phraseSearch) return none({ ...s, phraseSearch: false });
    return { state: null, effect: { type: "close" } };
  }

  return none(s);
}

export function fillReducer(s: FillState | null, e: FillEvent, platform: Platform): Result {
  switch (e.type) {
    case "open":
      // Never throw away what the user typed: ask first (Enter replaces, Escape keeps writing).
      if (s && s.text !== s.initial) return none({ ...s, pendingReplace: { templateId: e.templateId, title: e.title, text: e.text } });
      return openFresh(e);
    case "edit":
      return none(s && { ...s, text: e.text, selection: e.selection, confirmSubmit: false });
    case "select":
      return none(s && { ...s, selection: e.selection });
    case "insertPhrase": {
      if (!s) return none(null);
      const { start, end } = s.selection;
      const text = s.text.slice(0, start) + e.text + s.text.slice(end);
      const caret = start + e.text.length;
      const known = new Set([...s.known, ...placeholderSet(e.text)]);
      const selection = { start: caret, end: caret };
      return {
        state: { ...s, text, known, selection, phraseSearch: false, confirmSubmit: false },
        effect: { type: "select", range: selection },
      };
    }
    case "confirmReplace":
      return s?.pendingReplace ? openFresh(s.pendingReplace) : none(s);
    case "cancelReplace":
      return none(s && { ...s, pendingReplace: null });
    case "key":
      return s ? onKey(s, e.input, platform) : none(null);
  }
}
