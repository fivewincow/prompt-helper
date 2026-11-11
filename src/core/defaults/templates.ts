import type { Template } from "../types";

// Replaced at the owner's request on 2026-11-11 with the XML-tagged set they supplied.
// The default-content doc §1 still holds the earlier wording. Ask the user before changing any wording.

const planDoc = {
  claude: `<context>
- 대상 독자: {예: 프론트엔드 개발팀, 혹은 생략}
- 목적: {예: 이 문서로 신규 결제 플로우를 확정하려고 함}
- 참고 자료: @{기존 문서, 없으면 생략}
</context>

<task>
위 맥락을 바탕으로 문서의 초안을 작성해주세요.

[선택 1 - 바로 작성 시 남김]
- 분량: {약 N쪽}
- 형식: 문단 위주로 작성하고, 확실치 않은 수치는 [미정]으로 표기해주세요.

[선택 2 - 티키타카 필요 시 남김]
바로 초안을 작성하지 말고, 기획을 더 구체화하기 위해 제게 필요한 질문 3가지를 먼저 던져주세요.
</task>`,
  codex: `<objective>
{예: 관리자 페이지 대시보드 기획안 작성}
</objective>

<context>
- 핵심 콘셉트: {예: 한눈에 주요 지표 확인}
- 참고: @{관련 노트}
</context>

<task>
문서를 생성해주세요. 
출력: {docs/경로.md}
형식: 각 항목에 목적, 규칙, 미해결 질문을 포함할 것. 표는 비교할 때만 사용.
</task>`,
  gemini: `<context>
{여기에 기존 메모나 레퍼런스 텍스트 복붙, 없으면 생략}
</context>

<objective>
위 자료를 바탕으로 {어떤 문서}를 쓰려고 합니다. 이 문서로 {결정할 사항}을 정해야 합니다.
</objective>

<rules>
- 자료에 근거한 내용만 사실처럼 쓰고, 없는 내용은 '가정'으로 명확히 표시해주세요.
- 총 {분량} 정도로 자세하게 작성해주세요.
</rules>

<task>
이번 답변에서는 본문을 바로 쓰지 말고, 전체 목차(아웃라인)만 먼저 제안해 주세요. 목차를 확인한 뒤 작성 지시를 내리겠습니다.
</task>`,
};

const feature = {
  claude: `<objective>
{예: 유저 프로필 페이지에 이미지 업로드 기능 추가}
</objective>

<context>
- 관련 파일: @{수정할 파일}
- 참고 파일: @{비슷한 패턴을 가진 기존 파일}
</context>

<rules>
- 기존 코드의 패턴을 엄격히 따를 것
- 새로운 외부 라이브러리 추가 금지
</rules>

<task>
바로 코드를 작성하지 마세요. 먼저 \`<plan>\` 태그 안에 어떤 파일을 어떻게 수정할 것인지 단계별로 논리적인 계획을 작성해 주세요.
제가 계획을 읽고 승인하면 그때 코드를 구현해 주세요.
</task>`,
  codex: `<objective>
{사용자 입장에서 가능해져야 할 것}
</objective>

<context>
- 타겟 파일: @{관련 파일}
</context>

<rules>
- {유지할 API, 최대 3개}
- {제외할 작업}
</rules>

<task>
기능을 구현하고, 통과해야 할 {테스트 명령}을 제시해 주세요. 터미널에서 실행한 결과도 함께 보고해 주세요.
</task>`,
  gemini: `<context>
- 대상 파일: @{경로} @{타입 정의 경로}
- 목표: 위 코드를 바탕으로 {기능}을 만들어주세요.
- 배경: {왜 이 기능이 필요한지}
</context>

<rules>
- 지금 프로젝트에 설치된 라이브러리만 사용하세요.
- {범위 밖 파일}은 절대 수정하지 마세요.
</rules>

<task>
수정해야 할 파일 목록과 구현 방법을 \`<plan>\` 태그 안에 먼저 요약해 주세요. 제 승인이 떨어지면 코드를 작성하고, 실패 시 디버깅을 위해 {테스트 명령}을 제시해 주세요.
</task>`,
};

const test = {
  claude: `<objective>
@{테스트할 파일}에 대한 테스트 코드를 작성해 주세요.
- 참고할 기존 테스트 스타일: @{기존 테스트 파일}
</objective>

<cases>
다음을 반드시 포함하세요:
- 정상 동작: {예: 올바른 이메일 형식 입력 시}
- 경계값/빈 값: {예: 빈 문자열, null 전달 시}
- 에러 상황: {예: 네트워크 타임아웃 시}
</cases>

<rules>
- 구현 코드는 절대 수정하지 마세요. 버그가 발견되면 설명만 해 주세요.
- 기존에 있던 테스트 코드는 건드리지 마세요.
</rules>

<task>
작성 후 {테스트 명령}을 실행해 결과를 보고해 주고, 실패한 테스트가 있다면 원인을 분석해 주세요.
</task>`,
  codex: `<objective>
@{대상} 단위/통합 테스트 추가
- 기존 패턴: @{파일}
</objective>

<cases>
{정상 / 경계값 / 에러 상황}
</cases>

<rules>
구현 코드 수정 금지. 버그는 보고만 할 것.
</rules>

<task>
새 테스트 작성 후 {관련 테스트 명령} 통과 여부 및 결과를 보고해 주세요.
</task>`,
  gemini: `<context>
- 대상 파일: @{테스트할 파일}
- 기존 예시: @{기존 테스트 예시}
</context>

<objective>
위 코드에 대한 {단위/통합} 테스트를 추가해 주세요.
- 다룰 경우: {정상 동작}, {경계값·빈 값}, {에러 상황}
</objective>

<rules>
- 구현 코드와 기존 테스트는 수정하지 마세요.
</rules>

<task>
작성 후 {테스트 명령}을 실행하고, 다음 형식의 마크다운 표로 결과를 보고해 주세요:
| 테스트 케이스 | 결과 (Pass/Fail) | 실패 원인 (해당 시) |
</task>`,
};

const bugfix = {
  claude: `<bug_report>
- 기대 동작: {원래 어떻게 작동해야 하는지}
- 실제 동작: {현재 어떻게 고장 났는지}
- 재현 방법: {선택: 어떤 버튼을 누르면 에러가 나는지}
</bug_report>

<error_log>
{여기에 에러 메시지나 스택트레이스 복붙}
</error_log>

<context>
- 의심되는 위치: @{파일}
- 이미 시도해본 것: {선택}
</context>

<task>
1. 코드 수정 전에 \`<analysis>\` 태그 안에 원인을 깊이 있게 분석해 주세요.
2. 원인을 찾았다면 버그를 재현하는 실패 테스트 코드를 먼저 작성해 주세요.
3. 그 후, 최소한의 범위만 수정하여 버그를 고치고 {테스트 명령} 결과를 보고해 주세요.
(요청 범위 밖의 코드 리팩토링은 절대 하지 말고 제안만 하세요)
</task>`,
  codex: `<bug_report>
- 기대: {}
- 실제: {}
- 재현: 1. {} 2. {}
</bug_report>

<error_log>
{에러 로그 붙여넣기}
</error_log>

<task>
버그 재현 확인 -> 최소 범위 수정 -> 회귀 테스트 추가 -> {관련 테스트} 통과 확인. 실행한 명령과 결과를 짧게 보고해 주세요.
</task>`,
  gemini: `<error_log>
{스택트레이스 복붙 또는 @로그 파일}
</error_log>

<bug_report>
- 증상: {실제 동작과 기대 동작의 차이}
- 재현 스텝: {단계}
- 의심 위치: @{경로}
</bug_report>

<task>
위 정보를 바탕으로:
1. 가능한 원인을 2가지 이상 생각해서 근거 코드와 함께 설명해 주세요.
2. 원인이 확정되면 코드의 작동 로직은 유지한 채 최소 범위로만 수정해 주세요.
3. 수정한 부분이 다시 고장 나지 않도록 방지하는 테스트를 추가하고 {테스트 명령}으로 확인해 주세요.
</task>`,
};

const research = {
  claude: `<objective>
- 조사 대상: {무엇을 조사할지}
- 목적/용도: {이 자료를 어디에 쓸 것인지}
</objective>

<rules>
- 포함할 내용: {반드시 다뤄야 할 점}
- 제외할 내용: {다루지 말아야 할 점}
- 자료 우선순위: 공식 문서 > 개발자 커뮤니티
- 모든 주장이나 팩트에는 출처 URL을 달아주세요.
</rules>

<task>
출력 파일: {docs/경로.md}
형식: 3줄 요약 -> 상세 비교 -> 출처 목록
확인하지 못한 부분이나 근거가 부족한 부분은 추측하지 말고 [미확인]으로 명확히 표시해 주세요.
</task>`,
  codex: `<objective>
- 목표: {조사·정리할 것}
- 용도: {용도}
</objective>

<context>
- 이미 알고 있는 것: {맥락}
</context>

<rules>
- 범위 밖 주제 제외
- 출처 없는 주장은 쓰지 않기
</rules>

<task>
출력: {docs/경로.md}
진행 중 막히거나 정보가 부족하면 억지로 쓰지 말고, 무엇이 부족한지 보고하고 멈춰 주세요.
</task>`,
  gemini: `<context>
{참고할 텍스트나 @파일, 없으면 이 블록 지우기}
</context>

<objective>
- 질문: {가장 핵심적으로 알고 싶은 것}
- 배경: 저는 {현재 수준/직군}이며, 이 자료를 {용도}로 사용하려고 합니다. 오늘 날짜: {{today}}
</objective>

<task>
위 자료와 검색을 활용하여 자세히 답변해 주세요.
출력 형식: 서론 생략 -> 요약 3줄 -> 상세 설명 -> 출처 URL 목록
확실하지 않은 정보나 가정은 텍스트에 굵은 글씨로 따로 표시해 주세요.
</task>`,
};

const builtIn = (id: string, name: string, order: number, bodies: Template["bodies"]): Template => ({
  id,
  name,
  builtIn: true,
  hidden: false,
  order,
  bodies,
});

export const DEFAULT_TEMPLATES: Template[] = [
  builtIn("plan-doc", "기획 문서", 0, planDoc),
  builtIn("feature", "기능 개발", 1, feature),
  builtIn("test", "테스트", 2, test),
  builtIn("bugfix", "버그 수정", 3, bugfix),
  builtIn("research", "긴 작업 · 자료 조사", 4, research),
];
