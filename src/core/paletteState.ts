import type { KeyInput } from "./fillState";

export interface PaletteState {
  query: string;
  active: number;
}

export type PaletteEffect = { type: "none" } | { type: "choose"; index: number } | { type: "close" };

/** Keyboard handling for a searchable list (the palette and the fill window's phrase search). */
export function paletteKey(
  s: PaletteState,
  input: KeyInput,
  count: number,
): { state: PaletteState; effect: PaletteEffect } {
  const none = { type: "none" } as const;
  // While an IME is composing, Enter only commits the composition.
  if (input.isComposing) return { state: s, effect: none };
  switch (input.key) {
    case "ArrowDown":
      return { state: { ...s, active: count ? (s.active + 1) % count : 0 }, effect: none };
    case "ArrowUp":
      return { state: { ...s, active: count ? (s.active - 1 + count) % count : 0 }, effect: none };
    case "Enter":
      return { state: s, effect: count > 0 ? { type: "choose", index: Math.min(s.active, count - 1) } : none };
    case "Escape":
      return { state: s, effect: { type: "close" } };
    default:
      return { state: s, effect: none };
  }
}

export function setQuery(s: PaletteState, query: string): PaletteState {
  return { ...s, query, active: 0 };
}
