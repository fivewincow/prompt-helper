/**
 * State shared by the controller and the overlay window's React views. A tiny external
 * store (useSyncExternalStore) so the controller, which lives outside React, can drive the UI.
 */
import { useSyncExternalStore } from "react";
import { fillReducer, type FillEffect, type FillEvent, type FillState } from "../core/fillState";
import type { Range } from "../core/placeholders";
import type { AppData, Platform } from "../core/types";

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
}

let state: OverlayState = { view: "none", fill: null, data: null, platform: "mac", selectSeq: 0, selectRange: null };
const listeners = new Set<() => void>();
let effectHandler: (effect: FillEffect, closing: FillState) => void = () => {};

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
  setPlatform(platform: Platform) {
    set({ ...state, platform });
  },
  /** Paste and close effects are handled by the controller; selection moves by the view. */
  onFillEffect(handler: (effect: FillEffect, closing: FillState) => void) {
    effectHandler = handler;
  },
  dispatchFill(event: FillEvent) {
    const before = state.fill;
    const { state: fill, effect } = fillReducer(before, event, state.platform);
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
};

export function useOverlayStore(): OverlayState {
  return useSyncExternalStore(overlayStore.subscribe, overlayStore.get);
}
