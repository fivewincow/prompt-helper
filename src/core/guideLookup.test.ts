import { describe, expect, test } from "vitest";
import { guideFor, guideKeyAt } from "./guideLookup";
import { DEFAULT_TEMPLATES } from "./defaults/templates";
import { GUIDE_ENTRIES } from "./defaults/guide";

const body = DEFAULT_TEMPLATES.find((t) => t.id === "feature")!.bodies.claude;
const bug = DEFAULT_TEMPLATES.find((t) => t.id === "bugfix")!.bodies.claude;

describe("guideKeyAt", () => {
  test("cursor on a heading line maps that heading", () => {
    expect(guideKeyAt(body, body.indexOf("## 완료 조건") + 3)).toBe("done");
  });

  test("cursor inside a block maps the block's heading", () => {
    expect(guideKeyAt(body, body.indexOf("{관찰 가능한 동작}"))).toBe("done");
  });

  test("the closing sentence after the last block is the process entry", () => {
    expect(guideKeyAt(body, body.indexOf("코드 전에 계획을"))).toBe("process");
  });

  test("a blank line belongs to the block above it", () => {
    expect(guideKeyAt(body, body.indexOf("\n\n## 참고") + 1)).toBe("goal");
  });

  test("text before the first heading is pasted material", () => {
    expect(guideKeyAt(bug, 2)).toBe("material");
  });

  test("an unknown heading gets the general tips", () => {
    expect(guideKeyAt("## 메모\n자유롭게", 5)).toBe("general");
  });

  test("output headings map to output", () => {
    expect(guideKeyAt("## 출력 형식\nx", 3)).toBe("output");
  });
});

describe("guideFor", () => {
  test("falls back to the Claude Code source when the mode has none", () => {
    expect(guideFor("symptom", "gemini").source).toBe(GUIDE_ENTRIES.symptom.sources.claude);
  });

  test("uses the mode's own source", () => {
    expect(guideFor("done", "codex").source).toBe("https://learn.chatgpt.com/guides/best-practices");
  });

  test("combines the shared tip and the mode tip", () => {
    expect(guideFor("context", "claude").tips).toEqual([GUIDE_ENTRIES.context.tips.all]);
    expect(guideFor("done", "codex").tips).toEqual([GUIDE_ENTRIES.done.tips.codex]);
    expect(guideFor("cases", "gemini").tips).toEqual([]);
  });
});
