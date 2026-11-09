import { MODE_INFO } from "./modes";
import type { Mode, Platform } from "./types";

export function copiedOnlyMessage(p: Platform): string {
  return p === "mac" ? "⌘V로 붙여넣으세요 · 권한을 켜면 자동으로 붙여넣어요" : "Ctrl+V로 붙여넣으세요";
}

export function fellBackMessage(mode: Mode): string {
  return `이 모드(${MODE_INFO[mode].label}) 버전이 비어 있어 Claude Code 버전을 넣었어요`;
}

export function modeChangedMessage(mode: Mode): string {
  return `모드: ${MODE_INFO[mode].label}`;
}
