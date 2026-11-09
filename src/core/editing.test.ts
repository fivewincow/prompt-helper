import { describe, expect, test } from "vitest";
import {
  actionLabel,
  addPhrase,
  deletePhrase,
  movePhrase,
  setInsertMode,
  setLaunchAtLogin,
  updatePhrase,
  copyBodyToModes,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  moveTemplate,
  newId,
  setBinding,
  setTemplateBody,
  setTemplateHidden,
  setTemplateName,
} from "./editing";
import { mergeWithDefaults, toStored } from "./data";

const d = mergeWithDefaults(null);

describe("templates", () => {
  test("duplicating inserts a custom copy right after the original", () => {
    const dup = duplicateTemplate(d, "feature", "t-1");
    expect(dup.templates[2]).toMatchObject({ id: "t-1", name: "기능 개발 복사본", builtIn: false, hidden: false });
    expect(dup.templates[2].bodies).toEqual(d.templates[1].bodies);
    expect(dup.templates.map((t) => t.order)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("built-in templates cannot be deleted", () => {
    expect(deleteTemplate(d, "feature")).toBe(d);
  });

  test("deleting a custom template also clears its hotkey", () => {
    const withB = setBinding(createTemplate(d, "t-2"), "template:t-2", "Control+Alt+Digit6");
    const after = deleteTemplate(withB, "t-2");
    expect(after.templates.some((t) => t.id === "t-2")).toBe(false);
    expect(after.settings.bindings["template:t-2"]).toBeUndefined();
  });

  test("moving renumbers the order", () => {
    expect(moveTemplate(d, "research", 0).templates.map((t) => [t.id, t.order])[0]).toEqual(["research", 0]);
    expect(moveTemplate(d, "research", 0).templates.map((t) => t.order)).toEqual([0, 1, 2, 3, 4]);
  });

  test("copying a body to other modes", () => {
    const c = copyBodyToModes(setTemplateBody(d, "test", "claude", "X"), "test", "claude", ["codex", "gemini"]);
    expect(c.templates[2].bodies).toEqual({ claude: "X", codex: "X", gemini: "X" });
  });

  test("hiding a built-in is stored as an override only", () => {
    expect(toStored(setTemplateHidden(d, "test", true)).templateOverrides.test).toEqual({ hidden: true });
  });

  test("renaming", () => {
    expect(setTemplateName(d, "test", "단위 테스트").templates[2].name).toBe("단위 테스트");
  });

  test("a new template is empty and goes last", () => {
    expect(createTemplate(d, "t-3").templates.at(-1)).toMatchObject({
      id: "t-3",
      name: "새 템플릿",
      builtIn: false,
      order: 5,
      bodies: { claude: "", codex: "", gemini: "" },
    });
  });
});

test("setBinding sets and clears a hotkey", () => {
  expect(setBinding(d, "palette", null).settings.bindings.palette).toBeNull();
  expect(setBinding(d, "palette", "Control+Alt+KeyO").settings.bindings.palette).toBe("Control+Alt+KeyO");
});

test("newId uses the prefix and is unique", () => {
  const a = newId("t");
  expect(a).toMatch(/^t-/);
  expect(newId("t")).not.toBe(a);
});

test("actionLabel names hotkey actions for conflict messages", () => {
  expect(actionLabel("template:feature", d)).toBe("기능 개발");
  expect(actionLabel("palette", d)).toBe("검색 팝업");
  expect(actionLabel("cycleMode", d)).toBe("모드 전환");
  expect(actionLabel("template:gone", d)).toBe("삭제된 템플릿");
});

describe("phrases", () => {
  test("a new phrase is empty, applies to all modes and goes last in its category", () => {
    const a = addPhrase(d, "p-x", "범위");
    expect(a.phrases.find((p) => p.id === "p-x")).toMatchObject({ text: "", category: "범위", recommendedModes: "all" });
    const scope = a.phrases.filter((p) => p.category === "범위").sort((x, y) => x.order - y.order);
    expect(scope.at(-1)?.id).toBe("p-x");
  });

  test("an edited phrase list is stored; editing back to the default stores nothing", () => {
    expect(toStored(updatePhrase(d, "p01", { text: "계획부터" })).phrases).not.toBeNull();
    expect(toStored(updatePhrase(updatePhrase(d, "p01", { text: "x" }), "p01", { text: d.phrases[0].text })).phrases).toBeNull();
  });

  test("deleting a phrase removes it from recent too", () => {
    const r = { ...d, settings: { ...d.settings, recent: [{ kind: "phrase" as const, id: "p02" }] } };
    const after = deletePhrase(r, "p02");
    expect(after.settings.recent).toEqual([]);
    expect(after.phrases.some((p) => p.id === "p02")).toBe(false);
  });

  test("moving renumbers the order", () => {
    const moved = movePhrase(d, "p17", 0);
    expect(moved.phrases[0].id).toBe("p17");
    expect(moved.phrases.map((p) => p.order)).toEqual([...Array(17).keys()]);
  });
});

test("insert mode and launch at login", () => {
  expect(setInsertMode(d, "direct").settings.insertMode).toBe("direct");
  expect(setLaunchAtLogin(d, false).settings.launchAtLogin).toBe(false);
});
