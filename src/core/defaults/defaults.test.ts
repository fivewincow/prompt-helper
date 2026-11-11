import { expect, test } from "vitest";
import { DEFAULT_TEMPLATES } from "./templates";
import { DEFAULT_PHRASES } from "./phrases";
import { GUIDE_ENTRIES } from "./guide";
import { MODES } from "../modes";
import { PHRASE_CATEGORIES, type GuideKey } from "../types";

test("five built-in templates in the fixed order", () => {
  expect(DEFAULT_TEMPLATES.map((t) => t.id)).toEqual(["plan-doc", "feature", "test", "bugfix", "research"]);
  expect(DEFAULT_TEMPLATES.map((t) => t.name)).toEqual([
    "기획 문서",
    "기능 개발",
    "테스트",
    "버그 수정",
    "긴 작업 · 자료 조사",
  ]);
});

test("every built-in template has a body for every mode", () => {
  for (const t of DEFAULT_TEMPLATES) for (const m of MODES) expect(t.bodies[m].trim()).not.toBe("");
});

test("no built-in template carries outdated prompting advice", () => {
  for (const t of DEFAULT_TEMPLATES)
    for (const m of MODES) expect(t.bodies[m]).not.toMatch(/step by step|IMPORTANT|꼼꼼히/i);
});

test("eighteen phrases with valid categories", () => {
  expect(DEFAULT_PHRASES).toHaveLength(18);
  for (const p of DEFAULT_PHRASES) expect(PHRASE_CATEGORIES).toContain(p.category);
});

test("the rules-file phrase uses the auto variable and applies to all modes", () => {
  expect(DEFAULT_PHRASES.find((p) => p.text.includes("{{rulesFile}}"))?.recommendedModes).toBe("all");
});

test("every guide entry has a Claude Code source URL", () => {
  for (const k of Object.keys(GUIDE_ENTRIES))
    expect(GUIDE_ENTRIES[k as GuideKey].sources.claude).toMatch(/^https:\/\//);
});
