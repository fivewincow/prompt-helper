import { describe, expect, test } from "vitest";
import { paletteKey, setQuery } from "./paletteState";
import type { KeyInput } from "./fillState";

const ki = (key: string, isComposing = false): KeyInput => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  isComposing,
});

describe("paletteKey", () => {
  test("arrows wrap around", () => {
    expect(paletteKey({ query: "", active: 2 }, ki("ArrowDown"), 3).state.active).toBe(0);
    expect(paletteKey({ query: "", active: 0 }, ki("ArrowUp"), 3).state.active).toBe(2);
  });

  test("Enter during IME composition does not choose (Review Focus 1)", () => {
    expect(paletteKey({ query: "계", active: 1 }, ki("Enter", true), 3).effect).toEqual({ type: "none" });
  });

  test("Enter chooses the active item", () => {
    expect(paletteKey({ query: "계획", active: 1 }, ki("Enter"), 3).effect).toEqual({ type: "choose", index: 1 });
  });

  test("Enter with no results does nothing", () => {
    expect(paletteKey({ query: "zz", active: 0 }, ki("Enter"), 0).effect).toEqual({ type: "none" });
  });

  test("Escape closes", () => {
    expect(paletteKey({ query: "", active: 0 }, ki("Escape"), 3).effect).toEqual({ type: "close" });
  });

  test("arrows with no results stay put", () => {
    expect(paletteKey({ query: "zz", active: 0 }, ki("ArrowDown"), 0).state.active).toBe(0);
  });
});

test("a new query resets the selection to the top", () => {
  expect(setQuery({ query: "a", active: 4 }, "ab")).toEqual({ query: "ab", active: 0 });
});
