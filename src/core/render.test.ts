import { describe, expect, test } from "vitest";
import { renderText, resolveBody, todayString } from "./render";
import { DEFAULT_TEMPLATES } from "./defaults/templates";
import { nextMode } from "./modes";

describe("renderText", () => {
  const ctx = { today: "2026-11-09", mode: "codex" as const };

  test("replaces today and the mode's rules file", () => {
    expect(renderText("날짜 {{today}} / {{rulesFile}}", ctx)).toBe("날짜 2026-11-09 / AGENTS.md");
  });

  test("leaves single-brace blanks and unknown variables untouched", () => {
    expect(renderText("{무엇을} {{unknown}}", ctx)).toBe("{무엇을} {{unknown}}");
  });
});

describe("resolveBody", () => {
  const base = DEFAULT_TEMPLATES[1];
  const t = { ...base, bodies: { ...base.bodies, codex: "  \n" } };

  test("falls back to the Claude Code body when the mode body is blank", () => {
    expect(resolveBody(t, "codex")).toEqual({ body: t.bodies.claude, fellBack: true });
  });

  test("uses the mode body when present", () => {
    expect(resolveBody(t, "claude").fellBack).toBe(false);
  });
});

test("todayString pads month and day", () => {
  expect(todayString(new Date(2026, 0, 5))).toBe("2026-01-05");
});

test("nextMode cycles back to claude after gemini", () => {
  expect(nextMode("gemini")).toBe("claude");
});
