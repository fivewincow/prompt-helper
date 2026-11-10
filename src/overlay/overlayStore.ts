/**
 * State shared by the controller and the overlay window's React views. A tiny external
 * store (useSyncExternalStore) so the controller, which lives outside React, can drive the UI.
 */
import { useSyncExternalStore } from "react";
import { draftOf, fillReducer, type Draft, type FillEffect, type FillEvent, type FillState } from "../core/fillState";
import type { Range } from "../core/placeholders";
import type { AppData, ItemRef, Platform } from "../core/types";

export type OverlayView = "none" | "fill" | "palette";

export interface OverlayState {
  view: OverlayView;
  fill: FillState | null;
  /** Data snapshot for lists (phrases); set by the controller when it opens a view. */
  data: AppData | null;
  platform: Platform;
  /** Increments whenever the textarea selection must be moved programmatically. */
  selectSeq: number;
  selectRange: Range | null;
  /** Increments every time the palette opens, so the view can reset its query. */
  paletteSeq: number;
}

export type PaletteEvent = { type: "choose"; ref: ItemRef } | { type: "close"; reason: "escape" | "blur" };

let state: OverlayState = {
  view: "none",
  fill: null,
  data: null,
  platform: "mac",
  selectSeq: 0,
  selectRange: null,
  paletteSeq: 0,
};
const listeners = new Set<() => void>();
/**
 * Writing left without pasting (Escape, a switch to another template, a paste still running),
 * per template, while the app runs. Opening that template again continues it.
 */
const drafts = new Map<string, Draft>();
let draftsListener: (templateIds: ReadonlySet<string>) => void = () => {};

function keepDraft(templateId: string, draft: Draft | null) {
  const had = drafts.has(templateId);
  if (draft) drafts.set(templateId, draft);
  else drafts.delete(templateId);
  if (had !== drafts.has(templateId)) draftsListener(new Set(drafts.keys()));
}
let effectHandler: (effect: FillEffect, closing: FillState) => void = () => {};
let paletteHandler: (e: PaletteEvent) => void = () => {};

function set(next: OverlayState) {
  state = next;
  listeners.forEach((l) => l());
}

export const overlayStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setView(view: OverlayView, data?: AppData) {
    set({ ...state, view, data: data ?? state.data });
  },
  openPalette(data: AppData) {
    set({ ...state, view: "palette", data, paletteSeq: state.paletteSeq + 1 });
  },
  onPaletteEvent(handler: (e: PaletteEvent) => void) {
    paletteHandler = handler;
  },
  paletteEvent(e: PaletteEvent) {
    // A late blur after the palette already closed (or turned into the fill window) is ignored.
    if (state.view !== "palette") return;
    set({ ...state, view: "none" });
    paletteHandler(e);
  },
  setPlatform(platform: Platform) {
    set({ ...state, platform });
  },
  /** Paste and close effects are handled by the controller; selection moves by the view. */
  onFillEffect(handler: (effect: FillEffect, closing: FillState) => void) {
    effectHandler = handler;
  },
  dispatchFill(event: FillEvent) {
    const before = state.fill;
    const withDraft: FillEvent =
      event.type === "open" && !event.draft ? { ...event, draft: drafts.get(event.templateId) } : event;
    const { state: fill, effect } = fillReducer(before, withDraft, state.platform);
    if (before && fill?.templateId !== before.templateId) keepDraft(before.templateId, draftOf(before));
    const select = effect.type === "select";
    set({
      ...state,
      fill,
      view: fill ? "fill" : state.view === "fill" ? "none" : state.view,
      selectSeq: select ? state.selectSeq + 1 : state.selectSeq,
      selectRange: select ? effect.range : state.selectRange,
    });
    if ((effect.type === "paste" || effect.type === "close") && before) effectHandler(effect, before);
  },
  /** Called once a paste went through, so the next open starts from the template again. */
  dropDraft(templateId: string) {
    keepDraft(templateId, null);
  },
  /** Told whenever a template gains or loses its draft (the menu bar names them). */
  onDraftsChanged(listener: (templateIds: ReadonlySet<string>) => void) {
    draftsListener = listener;
  },
  draftIds: (): ReadonlySet<string> => new Set(drafts.keys()),
};

export function useOverlayStore(): OverlayState {
  return useSyncExternalStore(overlayStore.subscribe, overlayStore.get);
}
