import { describe, expect, test } from "vitest";
import { copiedOnlyMessage, fellBackMessage, importedMessage, modeChangedMessage } from "./messages";

test("copied-only notice tells the user which keys to press", () => {
  expect(copiedOnlyMessage("mac")).toBe("⌘V로 붙여넣으세요 · 권한을 켜면 자동으로 붙여넣어요");
  expect(copiedOnlyMessage("windows")).toBe("Ctrl+V로 붙여넣으세요");
});

test("fallback notice names the empty mode", () => {
  expect(fellBackMessage("codex")).toBe("이 모드(Codex) 버전이 비어 있어 Claude Code 버전을 넣었어요");
  expect(fellBackMessage("gemini")).toBe("이 모드(Gemini) 버전이 비어 있어 Claude Code 버전을 넣었어요");
});

test("mode change notice", () => {
  expect(modeChangedMessage("claude")).toBe("모드: Claude Code");
  expect(modeChangedMessage("codex")).toBe("모드: Codex");
  expect(modeChangedMessage("gemini")).toBe("모드: Gemini");
});

describe("importedMessage", () => {
  test("says what was added, renamed and skipped", () => {
    expect(importedMessage({ templates: 2, phrases: 3, skippedPhrases: 1, renamed: 1 }, 2)).toBe(
      "템플릿 2개, 문구 3개를 가져왔어요. 이름이 겹친 템플릿 1개는 번호를 붙였고, 이미 있는 문구 1개와 읽을 수 없는 항목 2개는 건너뛰었어요.",
    );
  });

  test("stays short when nothing was renamed or skipped", () => {
    expect(importedMessage({ templates: 1, phrases: 0, skippedPhrases: 0, renamed: 0 }, 0)).toBe(
      "템플릿 1개, 문구 0개를 가져왔어요.",
    );
  });
});
