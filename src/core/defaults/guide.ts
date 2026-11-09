import type { GuideEntry, GuideKey } from "../types";

// Transcribed from the default-content doc §3 (content) and §3.1 (sources per mode).
// A mode whose source is "—" in the doc has no entry here; guideFor falls back to Claude Code.

const CC_BEST = "https://code.claude.com/docs/en/best-practices";
const CLAUDE_PROMPTING =
  "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices";
const CLAUDE_OPUS5 = "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5";
const CODEX_BEST = "https://learn.chatgpt.com/guides/best-practices";
const CODEX_PROMPTING = "https://learn.chatgpt.com/docs/prompting";
const OPENAI_PROMPT_ENG = "https://developers.openai.com/api/docs/guides/prompt-engineering";
const GPT56_GUIDANCE = "https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6";
const GEMINI_STRATEGIES = "https://aistudio.google.com/docs/prompting-strategies";
const GEMINI_LONG_CONTEXT = "https://aistudio.google.com/docs/long-context";
const GEMINI_FILES = "https://geminicli.com/docs/cli/tutorials/file-management/";
const GEMINI_PLAN = "https://geminicli.com/docs/cli/plan-mode/";
const AGY_BEST = "https://antigravity.google/docs/cli/best-practices/";

export const GUIDE_ENTRIES: Record<GuideKey, GuideEntry> = {
  goal: {
    key: "goal",
    title: "목표",
    why: "무엇을 왜 하는지 알면 AI가 애매한 지점에서 맞는 쪽으로 판단해요",
    good: '"로그인에 Google 로그인 추가 — 이유: 가입 중 이탈 줄이기"',
    bad: '"로그인 개선해줘"',
    tips: { codex: "결과만 쓰고 방법은 맡겨요" },
    sources: { claude: CC_BEST, codex: CODEX_BEST, gemini: GEMINI_STRATEGIES },
  },
  context: {
    key: "context",
    title: "맥락",
    why: "파일을 말로 설명하는 것보다 직접 첨부하는 게 정확해요",
    good: '"@src/auth/kakao.ts 처럼 만들어줘"',
    bad: '"카카오 로그인 코드 있잖아, 그거처럼"',
    tips: { all: "기술 스택·폴더 구조는 AI가 직접 읽으니 쓰지 않아도 돼요" },
    sources: { claude: CC_BEST, codex: CODEX_BEST, gemini: GEMINI_FILES },
  },
  material: {
    key: "material",
    title: "자료",
    why: "긴 자료는 맨 앞에 두고 지시는 뒤에 두면 답이 좋아져요",
    good: "로그를 맨 위에 붙이고 질문은 아래에",
    bad: "질문 중간에 로그를 끼워 넣기",
    tips: {
      claude: "`<error_log>` 같은 태그로 감싸요",
      gemini: '뒤에서 "위 자료를 바탕으로"로 이어요',
    },
    sources: { claude: CLAUDE_PROMPTING, codex: OPENAI_PROMPT_ENG, gemini: GEMINI_LONG_CONTEXT },
  },
  scope: {
    key: "scope",
    title: "범위",
    why: "어디까지 손댈지 정하지 않으면 AI가 범위를 넓히거나 엉뚱한 곳을 고쳐요",
    good: '"제외: 결제 모듈은 그대로"',
    bad: '범위 없이 "알아서 잘"',
    tips: {
      claude: "범위를 넓히는 경향이 있어 특히 중요해요",
      gemini: "핵심 제약은 끝에 한 번 더 써요",
    },
    sources: { claude: CLAUDE_OPUS5, codex: CODEX_PROMPTING, gemini: GEMINI_STRATEGIES },
  },
  done: {
    key: "done",
    title: "완료 조건",
    why: "끝나는 기준이 없으면 AI가 어디서 멈출지 몰라요. 세 AI 공식 문서가 모두 가장 먼저 권해요",
    good: '"npm test 실행 후 명령과 결과를 보고해줘"',
    bad: '"꼼꼼히 다시 확인해줘"',
    tips: {
      claude: "막연한 확인 지시는 과한 검증을 불러요",
      codex: "테스트 범위를 정해 주면 과한 테스트를 막아요",
    },
    sources: { claude: CC_BEST, codex: CODEX_BEST, gemini: AGY_BEST },
  },
  output: {
    key: "output",
    title: "출력",
    why: "원하는 형태를 말하지 않으면 AI의 기본 스타일로 나와요",
    good: '"문단 위주, 약 3쪽, docs/gdd.md에"',
    bad: '"markdown 쓰지 마" (하지 말 것보다 원하는 형태를 쓰기)',
    tips: { gemini: "기본 답이 간결해서 자세히 원하면 꼭 적어요" },
    sources: { claude: CLAUDE_PROMPTING, codex: CODEX_PROMPTING, gemini: GEMINI_STRATEGIES },
  },
  process: {
    key: "process",
    title: "진행 방식",
    why: "복잡하거나 애매한 작업은 계획이나 인터뷰부터 받으면 헛수고가 줄어요",
    good: '"코드 전에 계획을 먼저 보여줘"',
    bad: '"수정 방법을 제안해줄래?" (제안만 하고 끝날 수 있어요)',
    tips: {
      codex: '바로 진행시키려면 "끝까지 진행해줘"라고 명시해요',
      gemini: "멈추라는 지시를 잘 안 지키니 단계를 나눠 요청해요",
    },
    sources: { claude: CLAUDE_PROMPTING, codex: CODEX_BEST, gemini: GEMINI_PLAN },
  },
  symptom: {
    key: "symptom",
    title: "증상",
    why: "재현 절차가 증상 설명보다 원인을 찾는 데 더 중요해요",
    good: '"1. 로그인 2. 새로고침 → 401"',
    bad: '"가끔 로그인이 풀려요"',
    tips: { all: "실패 테스트로 재현부터 시키면 수정 확인이 쉬워요" },
    sources: { claude: CC_BEST, codex: CODEX_BEST },
  },
  cases: {
    key: "cases",
    title: "다룰 경우",
    why: "경우를 정해 주지 않으면 정상 경로만 테스트하기 쉬워요",
    good: '"빈 배열, 음수, 네트워크 오류"',
    bad: '"테스트 좀 짜줘"',
    tips: {},
    sources: { claude: CC_BEST },
  },
  general: {
    key: "general",
    title: "일반 팁",
    why: '섹션 이름은 자유롭게 정해도 돼요. "왜"와 "언제 끝나는지"만은 꼭 남겨요',
    good: "짧고 구체적인 문장",
    bad: '"IMPORTANT", "step by step" 같은 예전 요령',
    tips: {},
    sources: { claude: CC_BEST, codex: GPT56_GUIDANCE, gemini: GEMINI_STRATEGIES },
  },
};

/** Section headings that map to a guide entry. The trailing closing sentence is handled in guideLookup. */
export const HEADING_TO_GUIDE: Record<string, GuideKey> = {
  목표: "goal",
  "목적과 독자": "goal",
  질문: "goal",
  참고: "context",
  맥락: "context",
  "관련 파일": "context",
  대상: "context",
  단서: "context",
  "의심 위치": "context",
  자료: "material",
  "에러·로그": "material",
  "범위와 제약": "scope",
  범위: "scope",
  제약: "scope",
  "완료 조건": "done",
  출력: "output",
  "출력 형식": "output",
  결과물: "output",
  요청: "process",
  증상: "symptom",
  재현: "symptom",
  "다룰 경우": "cases",
};
