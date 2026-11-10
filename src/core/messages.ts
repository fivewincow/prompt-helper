import { MODE_INFO } from "./modes";
import type { Mode, Platform } from "./types";
import type { ImportReport } from "./share";

export function copiedOnlyMessage(p: Platform): string {
  return p === "mac" ? "⌘V로 붙여넣으세요 · 권한을 켜면 자동으로 붙여넣어요" : "Ctrl+V로 붙여넣으세요";
}

export function fellBackMessage(mode: Mode): string {
  return `이 모드(${MODE_INFO[mode].label}) 버전이 비어 있어 Claude Code 버전을 넣었어요`;
}

export function modeChangedMessage(mode: Mode): string {
  return `모드: ${MODE_INFO[mode].label}`;
}

/** After an import: counts first, then what was renamed or left out (only when it happened). */
export function importedMessage(report: ImportReport, unreadable: number): string {
  const head = `템플릿 ${report.templates}개, 문구 ${report.phrases}개를 가져왔어요.`;
  const skipped = [
    report.skippedPhrases > 0 ? `이미 있는 문구 ${report.skippedPhrases}개` : "",
    unreadable > 0 ? `읽을 수 없는 항목 ${unreadable}개` : "",
  ].filter(Boolean);
  const notes = [
    report.renamed > 0 ? `이름이 겹친 템플릿 ${report.renamed}개는 번호를 붙였고` : "",
    skipped.length > 0 ? `${skipped.join("와 ")}는 건너뛰었어요.` : "",
  ].filter(Boolean);
  if (notes.length === 0) return head;
  // A rename note alone must still end the sentence.
  const tail = notes.join(", ").replace(/붙였고$/, "붙였어요.");
  return `${head} ${tail}`;
}
