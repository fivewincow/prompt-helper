import { beforeEach, expect, test } from "vitest";
import type { KeyInput } from "../core/fillState";
import { overlayStore } from "./overlayStore";

const key = (k: string, m: Partial<KeyInput> = {}) =>
  overlayStore.dispatchFill({
    type: "key",
    input: { key: k, metaKey: false, ctrlKey: false, shiftKey: false, isComposing: false, ...m },
  });
const open = (templateId: string, text: string) => overlayStore.dispatchFill({ type: "open", templateId, title: templateId, text });
const type = (text: string) => overlayStore.dispatchFill({ type: "edit", text, selection: { start: 0, end: 0 } });
const fill = () => overlayStore.get().fill;

beforeEach(() => {
  overlayStore.setPlatform("mac");
  overlayStore.dropDraft("feature");
  overlayStore.dropDraft("bugfix");
});

test("Escape keeps the writing as a draft for the next open", () => {
  open("feature", "{a}");
  type("written");
  key("Escape");
  expect(fill()).toBeNull();
  open("feature", "{a}");
  expect(fill()!.text).toBe("written");
  expect(fill()!.restored).toBe(true);
});

test("switching templates keeps the one left as a draft", () => {
  open("feature", "{a}");
  type("written");
  open("bugfix", "{b}");
  key("Enter");
  expect(fill()!.templateId).toBe("bugfix");
  key("Escape");
  open("feature", "{a}");
  expect(fill()!.text).toBe("written");
  key("Escape");
});

test("closing untouched text forgets an old draft", () => {
  open("feature", "{a}");
  type("written");
  key("Escape");
  open("feature", "{a}");
  key("r", { metaKey: true });
  key("Enter");
  key("Escape");
  open("feature", "{a}");
  expect(fill()!.text).toBe("{a}");
  key("Escape");
});

test("a draft stays until the paste is done, then goes", () => {
  open("feature", "{a}");
  type("written");
  key("Enter", { metaKey: true });
  // The controller drops the draft once the paste succeeded; a failed paste keeps it.
  open("feature", "{a}");
  expect(fill()!.text).toBe("written");
  key("Escape");
  overlayStore.dropDraft("feature");
  open("feature", "{a}");
  expect(fill()!.text).toBe("{a}");
  key("Escape");
});

test("a direct switch keeps the template left as a draft", () => {
  open("feature", "{a}");
  type("written");
  overlayStore.dispatchFill({ type: "open", templateId: "bugfix", title: "bugfix", text: "{b}", direct: true });
  expect(fill()!.templateId).toBe("bugfix");
  key("Escape");
  open("feature", "{a}");
  expect(fill()!.text).toBe("written");
  key("Escape");
});

test("listeners hear which templates have a draft", () => {
  const heard: string[][] = [];
  overlayStore.onDraftsChanged((ids) => heard.push([...ids].sort()));
  open("feature", "{a}");
  type("written");
  key("Escape");
  overlayStore.dropDraft("feature");
  expect(heard).toEqual([["feature"], []]);
  overlayStore.onDraftsChanged(() => {});
});
