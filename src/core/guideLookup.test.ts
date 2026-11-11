import { describe, expect, test } from "vitest";
import { closingLines, guideFor, guideKeyAt } from "./guideLookup";
import { GUIDE_ENTRIES } from "./defaults/guide";

// The lookup reads "## " headings. The built-in templates use XML tags instead, so these
// tests carry their own heading-style text.
const body = `## 목표
{무엇을} — 이유: {왜}

## 참고
@{따라할 파일}

## 범위와 제약
- 포함: {}
- 제외: {}

## 완료 조건
- {관찰 가능한 동작}
- {테스트 명령} 실행 후 명령과 결과를 보고해줘

코드 전에 계획을 먼저 보여줘`;
const bug = `<error_log>
{에러 메시지}
</error_log>

## 증상
{실제 동작}`;

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

describe("closingLines", () => {
  test("marks the lines after the last block as the closing sentence", () => {
    const lines = body.split("\n");
    const closing = closingLines(body);
    expect([...closing].map((i) => lines[i])).toEqual(["코드 전에 계획을 먼저 보여줘"]);
  });

  test("a template whose last block runs to the end has no closing sentence", () => {
    expect(closingLines("## 목표\nx\n\n## 완료 조건\ny").size).toBe(0);
  });

  test("text without headings has no closing sentence", () => {
    expect(closingLines("그냥 문장").size).toBe(0);
  });
});
