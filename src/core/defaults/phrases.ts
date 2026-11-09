import type { Mode, Phrase, PhraseCategory } from "../types";

// Transcribed from the default-content doc §2, in table order (p01..p17).
// "전체" → 'all'; "{규칙 파일}" → the {{rulesFile}} auto variable.
const rows: Array<[PhraseCategory, string, Mode[] | "all"]> = [
  ["진행 방식", "코드 전에 계획을 먼저 보여줘", "all"],
  ["진행 방식", "계획만 세우고 멈춰줘", "all"],
  ["진행 방식", "바로 쓰지 말고 먼저 나를 인터뷰해서 빈칸을 채워줘", "all"],
  ["진행 방식", "확인 질문 없이 맥락에서 판단해서 끝까지 진행해줘", ["codex"]],
  ["진행 방식", "이번 답변에서는 {첫 단계}까지만 해줘", ["gemini"]],
  ["범위", "요청 범위 밖의 수정은 하지 말고 끝에 제안만 해줘", ["claude"]],
  ["범위", "지금 있는 라이브러리만 써줘", "all"],
  ["범위", "테스트는 바뀐 부분과 관련된 것만 돌려줘", ["codex"]],
  ["보고·검증", "{테스트 명령} 실행 후 명령과 결과를 보고해줘", "all"],
  ["보고·검증", "끝나면 바뀐 파일, 검증 결과, 남은 이슈를 정리해줘", "all"],
  ["보고·검증", "확인하지 못한 부분은 [미확인]으로 표시해줘", "all"],
  ["자료·맥락", "위 자료를 바탕으로", ["gemini"]],
  ["자료·맥락", "위 자료만 근거로 답해줘", ["gemini"]],
  ["자료·맥락", "작업 전에 {{rulesFile}}을 먼저 읽어줘", "all"],
  ["출력", "결론부터 말해줘", "all"],
  ["출력", "자세하게 설명해줘", ["gemini"]],
  ["출력", "문단 위주로 쓰고, 표는 비교할 때만 써줘", "all"],
];

export const DEFAULT_PHRASES: Phrase[] = rows.map(([category, text, recommendedModes], i) => ({
  id: `p${String(i + 1).padStart(2, "0")}`,
  text,
  category,
  recommendedModes,
  order: i,
}));
