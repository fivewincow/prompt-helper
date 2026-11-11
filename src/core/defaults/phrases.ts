import type { Mode, Phrase, PhraseCategory } from "../types";

// Replaced at the owner's request on 2026-11-11 with the set they supplied (p01..p18).
// Their "안전·제약" rows are filed under "범위" and "출력 형식" under "출력", the app's own categories.
// The default-content doc §2 still holds the earlier wording.
const rows: Array<[PhraseCategory, string, Mode[] | "all"]> = [
  ["진행 방식", "코드 전에 `<plan>` 태그 안에 단계별 계획을 먼저 보여줘", "all"],
  ["진행 방식", "계획만 세우고 내 승인을 기다려줘", "all"],
  ["진행 방식", "바로 시작하지 말고, 작업을 위해 나에게 필요한 질문 3가지를 먼저 해줘", "all"],
  ["진행 방식", "확인 질문 없이 맥락에서 판단해서 끝까지 진행해줘", ["codex"]],
  ["진행 방식", "이번 답변에서는 전체 목차(아웃라인)까지만 작성해줘", ["gemini"]],
  ["범위", "모르는 내용이나 코드에 없는 부분은 추측해서 지어내지 말고, '정보 부족'이라고 명확히 말해줘", "all"],
  ["범위", "요청 범위 밖의 코드 수정(리팩토링 등)은 절대 하지 말고 끝에 제안만 해줘", ["claude", "gemini"]],
  ["범위", "현재 프로젝트에 설치된 라이브러리만 사용해줘", "all"],
  ["범위", "기능을 변경하지 마. 오직 가독성과 유지보수성 향상에만 초점을 맞춰줘", "all"],
  ["보고·검증", "{테스트 명령} 실행 후 터미널 명령어와 결과를 보고해줘", "all"],
  ["보고·검증", "작업이 끝나면 바뀐 파일, 검증 결과, 남은 이슈를 리스트로 정리해줘", "all"],
  ["보고·검증", "근거가 명확하지 않거나 확인하지 못한 수치는 [미확인]으로 표시해줘", "all"],
  ["자료·맥락", "위 자료만을 근거로 답하고 외부 지식은 섞지 마", ["gemini"]],
  ["자료·맥락", "작업 전에 {{rulesFile}}을 먼저 읽고 컨벤션을 숙지해줘", "all"],
  ["출력", "결론부터 두괄식으로 말해줘", "all"],
  ["출력", "설명이나 마크다운 코드블록(```) 없이, 오직 터미널에 바로 복사할 수 있는 명령어만 출력해줘", ["codex"]],
  ["출력", "주니어 개발자에게 코드 리뷰를 하듯 친절하게 설명하되, 개선점은 명확하게 짚어줘", ["claude", "gemini"]],
  ["출력", "문단 위주로 쓰고, 표는 비교할 때만 써줘", "all"],
];

export const DEFAULT_PHRASES: Phrase[] = rows.map(([category, text, recommendedModes], i) => ({
  id: `p${String(i + 1).padStart(2, "0")}`,
  text,
  category,
  recommendedModes,
  order: i,
}));
