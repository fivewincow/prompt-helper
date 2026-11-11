import { describe, expect, test } from "vitest";
import { bindingsToRegister, planAction, planPhrase } from "./actions";
import { mergeWithDefaults } from "./data";
import { renderText } from "./render";

const data = mergeWithDefaults(null);
const hidden = { ...data, templates: data.templates.map((t) => (t.id === "test" ? { ...t, hidden: true } : t)) };

describe("planAction", () => {
  test("a template hotkey opens the fill window with the rendered body by default", () => {
    const p = planAction("template:feature", data, "2026-11-09");
    expect(p).toMatchObject({ kind: "fill", templateId: "feature", title: "기능 개발 · Claude Code", fellBack: false });
    expect(p.kind === "fill" && p.text).toBe(
      renderText(data.templates[1].bodies.claude, { today: "2026-11-09", mode: "claude" }),
    );
  });

  test("direct insert mode pastes the template right away", () => {
    const direct = { ...data, settings: { ...data.settings, insertMode: "direct" as const } };
    expect(planAction("template:feature", direct, "2026-11-09")).toMatchObject({
      kind: "paste",
      ref: { kind: "template", id: "feature" },
    });
  });

  test("an empty mode body falls back to Claude Code and says so", () => {
    const blank = {
      ...data,
      settings: { ...data.settings, mode: "codex" as const },
      templates: data.templates.map((t) => (t.id === "feature" ? { ...t, bodies: { ...t.bodies, codex: "" } } : t)),
    };
    expect(planAction("template:feature", blank, "")).toMatchObject({ kind: "fill", fellBack: true });
  });

  test("cycle and palette actions", () => {
    expect(planAction("cycleMode", data, "")).toEqual({ kind: "cycleMode", next: "codex" });
    expect(planAction("palette", data, "")).toEqual({ kind: "palette" });
  });

  test("a hidden or unknown template does nothing", () => {
    expect(planAction("template:test", hidden, "").kind).toBe("none");
    expect(planAction("template:nope", data, "").kind).toBe("none");
  });
});

test("hidden templates are not registered as hotkeys", () => {
  expect(bindingsToRegister(hidden).map((b) => b.actionId)).not.toContain("template:test");
  expect(bindingsToRegister(data).map((b) => b.actionId)).toEqual(
    expect.arrayContaining(["template:feature", "palette", "cycleMode"]),
  );
});

test("cleared bindings are not registered", () => {
  const cleared = { ...data, settings: { ...data.settings, bindings: { ...data.settings.bindings, palette: null } } };
  expect(bindingsToRegister(cleared).map((b) => b.actionId)).not.toContain("palette");
});

test("phrases render the current mode's rules file", () => {
  expect(planPhrase("p14", { ...data, settings: { ...data.settings, mode: "gemini" } }, "")).toMatchObject({
    kind: "paste",
    text: "작업 전에 GEMINI.md을 먼저 읽고 컨벤션을 숙지해줘",
    ref: { kind: "phrase", id: "p14" },
  });
  expect(planPhrase("nope", data, "").kind).toBe("none");
});
