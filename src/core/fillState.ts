import { isPrimaryMod } from "./hotkeys";
import { findPlaceholders, type Range } from "./placeholders";
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

/** What the fill window keeps of a template the user left without pasting. */
export interface Draft {
  text: string;
  blanks: Range[];
  selection: Range;
}

type OpenRequest = { templateId: string; title: string; text: string; draft?: Draft };

export interface FillState {
  templateId: string;
  title: string;
  initial: string;
  text: string;
  /**
   * Positions of the template's own blanks (plus those of inserted phrases), moved along with
   * every edit. Tracking positions rather than text keeps a pasted `{}` (an empty JSON object
   * in a log) from being mistaken for an unfilled blank.
   */
  blanks: Range[];
  selection: Range;
  confirmSubmit: boolean;
  pendingReplace: OpenRequest | null;
  /** Cmd+R on edited text: waiting for Enter (reset to the template) or Escape. */
  pendingReset: boolean;
  /** The text came from a draft and the user has not edited it yet. */
  restored: boolean;
  phraseSearch: boolean;
}

export type FillEvent =
  | ({ type: "open" } & OpenRequest)
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
  return s.blanks.length;
}

/** The draft to keep when the user leaves `s`; null when nothing was written. */
export function draftOf(s: FillState): Draft | null {
  return s.text === s.initial ? null : { text: s.text, blanks: s.blanks, selection: s.selection };
}

/** Moves blanks through an edit: untouched ones shift, ones the edit overlaps count as filled. */
export function shiftBlanks(blanks: Range[], before: string, after: string): Range[] {
  const max = Math.min(before.length, after.length);
  let prefix = 0;
  while (prefix < max && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < max - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  const changedEnd = before.length - suffix;
  const delta = after.length - before.length;
  return blanks.flatMap((r) => {
    if (r.end <= prefix) return [r];
    if (r.start >= changedEnd) return [{ start: r.start + delta, end: r.end + delta }];
    return [];
  });
}

function nextBlank(blanks: Range[], from: number, dir: 1 | -1): Range | null {
  if (blanks.length === 0) return null;
  if (dir === 1) return blanks.find((r) => r.start >= from) ?? blanks[0];
  const before = blanks.filter((r) => r.end <= from);
  return before.length > 0 ? before[before.length - 1] : blanks[blanks.length - 1];
}

function firstBlank(text: string, blanks: Range[]): Range {
  return blanks[0] ?? { start: text.length, end: text.length };
}

/** Opens a template, continuing its draft when there is one. */
function openFresh(o: OpenRequest): Result {
  const blanks = o.draft?.blanks ?? findPlaceholders(o.text);
  const text = o.draft?.text ?? o.text;
  const selection = o.draft?.selection ?? firstBlank(text, blanks);
  return {
    state: {
      templateId: o.templateId,
      title: o.title,
      initial: o.text,
      text,
      blanks,
      selection,
      confirmSubmit: false,
      pendingReplace: null,
      pendingReset: false,
      restored: o.draft !== undefined,
      phraseSearch: false,
    },
    effect: { type: "select", range: selection },
  };
}

/** Back to the template as written, first blank selected. */
function resetToTemplate(s: FillState): Result {
  return openFresh({ templateId: s.templateId, title: s.title, text: s.initial });
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

  if (s.pendingReset) {
    if (input.key === "Enter") return resetToTemplate(s);
    if (input.key === "Escape") return none({ ...s, pendingReset: false });
    return none(s);
  }

  const primary = isPrimaryMod(input, platform);

  // Cmd+R: back to the template. Edited text is asked about first; untouched text has
  // nothing to lose, so it only goes back to the first blank.
  if (primary && isKey(input, "r")) return draftOf(s) ? none({ ...s, pendingReset: true }) : resetToTemplate(s);

  if (input.key === "Tab") {
    const dir = input.shiftKey ? -1 : 1;
    const from = dir === 1 ? s.selection.end : s.selection.start;
    const r = nextBlank(s.blanks, from, dir);
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
    case "open": {
      const request: OpenRequest = { templateId: e.templateId, title: e.title, text: e.text, draft: e.draft };
      // The hotkey of the template being written just keeps the writing.
      if (s && s.templateId === e.templateId && draftOf(s)) return none(s);
      // Ask before leaving written text (it is kept as a draft): Enter switches, Escape stays.
      if (s && draftOf(s)) return none({ ...s, pendingReplace: request, pendingReset: false });
      return openFresh(request);
    }
    case "edit":
      return none(
        s && {
          ...s,
          text: e.text,
          blanks: shiftBlanks(s.blanks, s.text, e.text),
          selection: e.selection,
          confirmSubmit: false,
          restored: false,
        },
      );
    case "select":
      return none(s && { ...s, selection: e.selection });
    case "insertPhrase": {
      if (!s) return none(null);
      const { start, end } = s.selection;
      const text = s.text.slice(0, start) + e.text + s.text.slice(end);
      const caret = start + e.text.length;
      const delta = e.text.length - (end - start);
      const kept = s.blanks.flatMap((r) =>
        r.end <= start ? [r] : r.start >= end ? [{ start: r.start + delta, end: r.end + delta }] : [],
      );
      const added = findPlaceholders(e.text).map((r) => ({ start: r.start + start, end: r.end + start }));
      const blanks = [...kept, ...added].sort((a, b) => a.start - b.start);
      const selection = { start: caret, end: caret };
      return {
        state: { ...s, text, blanks, selection, phraseSearch: false, confirmSubmit: false },
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
