import { expect, test } from "vitest";
import { buildMenuModel, trayTitle, type MenuNode } from "./menuModel";
import { mergeWithDefaults } from "./data";
import { PHRASE_CATEGORIES } from "./types";

const data = mergeWithDefaults(null);
const submenu = (m: MenuNode[], text: string) =>
  m.find((n): n is Extract<MenuNode, { type: "submenu" }> => n.type === "submenu" && n.text === text)!;

test("the current mode is checked", () => {
  const m = buildMenuModel({ ...data, settings: { ...data.settings, mode: "codex" } }, "mac", true);
  const modes = m.filter((n): n is Extract<MenuNode, { type: "item" }> => n.type === "item" && n.id.startsWith("mode:"));
  expect(modes.map((n) => n.checked)).toEqual([false, true, false]);
});

test("templates show their hotkey in the platform's notation", () => {
  const tpl = submenu(buildMenuModel(data, "mac", true), "템플릿");
  expect(tpl.items[1]).toMatchObject({ id: "template:feature", text: "기능 개발", accelerator: "⌃⌥2" });
  expect(submenu(buildMenuModel(data, "windows", true), "템플릿").items[1]).toMatchObject({ accelerator: "Ctrl+Alt+2" });
});

test("hidden templates are left out and cleared hotkeys show none", () => {
  const changed = {
    ...data,
    templates: data.templates.map((t) => (t.id === "test" ? { ...t, hidden: true } : t)),
    settings: { ...data.settings, bindings: { ...data.settings.bindings, "template:feature": null } },
  };
  const tpl = submenu(buildMenuModel(changed, "mac", true), "템플릿");
  expect(tpl.items.map((n) => n.type === "item" && n.id)).not.toContain("template:test");
  expect(tpl.items[1]).toMatchObject({ id: "template:feature", accelerator: undefined });
});

test("phrases are grouped under category labels", () => {
  const phr = submenu(buildMenuModel(data, "mac", true), "문구");
  expect(phr.items.filter((n) => n.type === "label").map((n) => n.type === "label" && n.text)).toEqual([
    ...PHRASE_CATEGORIES,
  ]);
  expect(phr.items[1]).toMatchObject({ type: "item", id: "phrase:p01" });
});

test("the permission item appears only on mac without permission", () => {
  expect(JSON.stringify(buildMenuModel(data, "mac", true))).not.toContain("open-accessibility");
  expect(JSON.stringify(buildMenuModel(data, "mac", false))).toContain("open-accessibility");
  expect(JSON.stringify(buildMenuModel(data, "windows", false))).not.toContain("open-accessibility");
});

test("ends with editor, settings and quit", () => {
  const ids = buildMenuModel(data, "mac", true).flatMap((n) => (n.type === "item" ? [n.id] : []));
  expect(ids.slice(-3)).toEqual(["open-editor", "open-settings", "quit"]);
});

test("menu bar title per mode", () => {
  expect(trayTitle("claude")).toBe("CC");
  expect(trayTitle("gemini")).toBe("GM");
});

test("empty phrases are not shown in the menu", () => {
  const withEmpty = { ...data, phrases: [...data.phrases, { ...data.phrases[0], id: "p-empty", text: "" }] };
  expect(JSON.stringify(buildMenuModel(withEmpty, "mac", true))).not.toContain("phrase:p-empty");
});

test("templates with a draft say so in the menu", () => {
  const tpl = submenu(buildMenuModel(data, "mac", true, new Set(["feature"])), "템플릿");
  expect(tpl.items[1]).toMatchObject({ id: "template:feature", text: "기능 개발 · 임시저장" });
  expect(tpl.items[0]).toMatchObject({ id: "template:plan-doc", text: "기획 문서" });
});
