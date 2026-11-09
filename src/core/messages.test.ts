import { expect, test } from "vitest";
import { copiedOnlyMessage, fellBackMessage, modeChangedMessage } from "./messages";

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
