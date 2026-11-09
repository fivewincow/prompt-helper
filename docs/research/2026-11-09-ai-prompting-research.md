# AI 코딩 에이전트별 프롬프트 작성법 조사 (2026-11-09)

Claude Code, Codex, Gemini(앱 + Gemini CLI / Antigravity CLI)의 공식 문서와 커뮤니티 자료를 조사해 정리한 문서다. 이 문서는 프롬프트 헬퍼 앱의 기본 템플릿, 문구 모음, 가이드 문구의 근거로 쓴다.

- 조사 방식: 공식 문서를 먼저 보고, 커뮤니티 자료는 보조로 썼다. 주장마다 `[공식]` 또는 `[커뮤니티]`를 붙였다.
- 기준 모델:
  - Claude Code: Claude Opus 5.5 (기본 effort `medium`)
  - Codex: GPT-6 계열 (Astra 등)
  - Gemini: Gemini 4 Argon (단, Argon 전용 공식 가이드는 아직 없어서 Gemini 3 시절 가이드를 기준으로 했다)
- 주의: 이 분야는 몇 달 단위로 바뀐다. 기본 템플릿을 고칠 때 이 문서의 날짜를 확인하고 다시 조사한다.

---

## 1. 결론 요약

1. **사수 방식(`[목표] / [환경] / [지시사항]` + 번호 목록)은 방향이 맞다.** 세 AI 모두 섹션을 나눈 프롬프트를 권한다. 다만 공식 문서 기준으로 다섯 군데를 고치는 게 좋다.
   - **[완료 조건]을 추가한다.** 세 문서 모두 가장 먼저 권하는 항목이다. 실행할 검증 명령을 쓰고, 그 결과를 증거로 보고하게 한다.
   - **[환경]을 줄인다.** 에이전트는 코드를 직접 읽는다. 기술 스택이나 폴더 구조는 쓰지 않고, 레포 밖 정보(회의 결정, 실행 환경)만 남긴다. 매번 같은 내용은 규칙 파일(`CLAUDE.md` / `AGENTS.md` / `GEMINI.md`)로 옮긴다.
   - **[목표]에 "왜"를 넣는다.** 이유를 알면 AI가 판단을 더 잘한다 [공식, Claude].
   - **[범위·제약]을 추가한다.** 건드리지 말 곳, 새 라이브러리 금지 같은 내용이다.
   - **번호 목록은 순서가 중요할 때만 쓴다.** 최신 모델은 지시를 글자 그대로 따르는 경향이 있어서, 과하게 쓴 단계가 그대로 실행된다.
2. **라벨 표기(`[목표]`, `## 목표`, `목표:`)는 기능상 차이가 없다.** 이 차이를 검증한 공식 데이터도 없다. 다만 Gemini는 한 프롬프트 안에서 한 가지로 통일하라고 한다. 앱의 기본 템플릿은 `## 제목`으로 통일한다.
3. **붙여넣는 긴 자료는 맨 앞에 두고, 여닫는 태그로 감싼다.** 지시는 맨 끝에 둔다. 세 AI 공통이다.
4. **예전 요령은 뺀다.** "think step by step", "IMPORTANT" 같은 대문자 강조, "꼼꼼히 다시 확인해" 같은 막연한 검증 지시, temperature 조정 같은 것들이다. 최신 모델에서는 효과가 없거나 오히려 해롭다.
5. **작업마다 진행 방식을 고르게 한다.** 선택지는 바로 진행, 계획 먼저, 인터뷰 먼저 세 가지다. 세 AI 모두 이 기능을 갖고 있다.

## 2. 세 AI 공통 뼈대

| 섹션 | 쓰는 내용 | 근거 |
|---|---|---|
| 목표 | 무엇을, 왜 | Claude·Codex·Gemini 공식 |
| 맥락·참고 | `@파일`로 첨부. 붙여넣는 긴 자료는 맨 앞에 | 세 AI 공식 |
| 범위·제약 | 포함/제외, 금지 사항 (1~3개) | 세 AI 공식 |
| 출력 형식 | 결과물 형태, 파일 경로, 분량, 문체 | Codex(Output)·Gemini 공식 |
| 완료 조건 | 관찰 가능한 동작, 검증 명령, 결과 보고 | Claude·Codex 공식, Gemini CLI/agy 공식 |
| 진행 방식 | 바로 진행 / 계획 먼저 / 인터뷰 먼저 | 세 AI 공식 (plan mode, interview) |

Codex 공식 문서는 프롬프트를 **Goal / Context / Constraints / Done when**으로 나눈다. 다른 공식 페이지는 **Goal / Context / Output / Boundaries**로 나눈다. 위 표는 이 둘을 합친 것이다.

## 3. AI별 차이

### 3.1 Claude Code

**형식**
- 직접 쓰는 짧은 섹션은 `[목표]`든 `## 목표`든 상관없다.
- 붙여넣는 로그, 기획서, 메일은 `<error_log>...</error_log>`처럼 여닫는 XML 태그로 감싼다. 태그 안의 지시를 덜 따르게 되는 효과도 있다 [공식].
- 프롬프트 스타일이 답변 스타일에 영향을 준다. 불릿이 많은 프롬프트는 불릿이 많은 답을 낳는다. 문서를 서술형으로 받고 싶으면 프롬프트도 서술형으로 쓴다 [공식].

**성향과 대응**
- Opus 5는 범위를 넓히려는 경향이 있다. Sonnet 5.5는 요청하지 않은 테스트나 문서를 덧붙이는 경향이 있다. 그래서 범위를 명시한다 [공식].
- 지시는 행동 동사로 끝맺는다. "수정 방법을 제안해줄래?"라고 하면 실제로 고치지 않고 제안만 할 수 있다 [공식].

**하지 말 것**
- IMPORTANT나 전부 대문자로 쓴 강조. 현재 모델은 이런 규칙을 오히려 과하게 적용한다 [공식].
- "think hard" 같은 표현. 실제로 생각의 깊이를 조절하는 수단은 `/effort`이고, 한 턴만 깊게 생각시키려면 `ultrathink`를 쓴다 [공식].
- "double-check해", "subagent로 검증해" 같은 일반적인 검증 지시. Opus 5 이상에서 과검증을 일으킨다. 대신 구체적인 명령을 주고 결과를 증거로 요구한다 [공식].
- "계속해, 게으름 피우지 마" 같은 재촉. 과작업을 부른다 [공식].

**도구 기능**
- 규칙 파일은 `CLAUDE.md`다. 200줄 미만으로 쓰고, 테스트/타입체크/린트 명령과 레포 밖 결정을 담는다 [공식].
- `@파일`로 파일 내용을 첨부한다.
- Plan mode는 `Shift+Tab` 또는 `/plan`으로 켠다.
- 재사용 프롬프트는 skill로 만든다.

**요구사항이 흐릴 때**
- "나를 인터뷰해서 SPEC.md를 쓰고, 새 세션에서 구현"하는 흐름을 권한다 [공식].

출처: https://code.claude.com/docs/en/best-practices, https://code.claude.com/docs/en/memory, https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices, https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5, https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

### 3.2 Codex

**형식과 길이**
- 세 AI 중 **가장 짧고, 덜 지시적으로** 써야 한다.
- 단계별 스크립트는 쓰지 않는다. 목적지, 핵심 제약, 사용할 근거, 완료 기준만 적는다 [공식, GPT-5.6 가이드].
- 반복된 규칙과 ALWAYS/NEVER 남발을 걷어낸 짧은 프롬프트가 OpenAI 내부 평가에서 더 나았다 [공식, 수치는 2차 보도].
- "묻기 전에 확인해" 같은 규칙을 반복하면 불필요한 승인 요청만 늘어난다 [공식].

**최신 모델(GPT-6 Astra)의 성향과 대응**
- 확인 질문을 많이 한다. 자율적으로 진행하길 원하면 "맥락에서 판단해 끝까지 진행해"라고 명시한다 [공식].
- 출력에 서식을 많이 쓴다. 산문을 원하면 그렇게 지정한다 [공식].
- 작은 변경에도 테스트를 과하게 돌린다. 테스트 범위를 명시한다 [공식].

**하지 말 것**
- 근거가 부족할 때 추측하게 두지 않는다. 빈칸으로 표시하라고 시킨다 [공식].

**도구 기능**
- 규칙 파일은 `AGENTS.md`다. Codex는 `CLAUDE.md`를 기본으로 읽지 않는다.
- `/plan`으로 계획부터 받는다. 공식 문서는 복잡한 작업에 이 방식을 가장 권한다.
- `/goal`은 긴 작업용이다. 결과, 검증 근거, 제약, 입력, 반복 정책, 막혔을 때 보고할 내용을 계약처럼 적는다.
- `/review`로 코드 리뷰를 맡긴다.
- 재사용 프롬프트는 skill(`$name`)로 만든다. 예전의 custom prompts는 deprecated다.

출처: https://learn.chatgpt.com/guides/best-practices, https://learn.chatgpt.com/docs/prompting, https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6, https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md, https://learn.chatgpt.com/docs/agent-configuration/agents-md, https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex.md

### 3.3 Gemini (앱, Gemini CLI, Antigravity CLI)

**도구 상황 변화**
- **2026-06-18부터 개인 사용자는 Gemini CLI를 쓸 수 없다.** 대신 Antigravity CLI(`agy`)를 쓴다.
- `agy`도 `GEMINI.md`와 `AGENTS.md`를 읽는다. Gemini CLI의 TOML 커스텀 커맨드는 skill로 변환된다.

**형식**
- XML 태그와 Markdown 제목 중 **하나만 골라 한 프롬프트 안에서 일관되게** 쓴다 [공식].
- 긴 자료를 먼저 두고, 질문과 지시는 끝에 둔다. "위 자료를 바탕으로" 같은 연결 문구로 잇는다 [공식].

**성향과 대응**
- 기본 답이 간결하다. 자세한 답이 필요하면 명시한다 [공식].
- 핵심 제약을 어디에 둘지는 공식 문서끼리 의견이 다르다. AI Studio는 앞에, Vertex 가이드는 끝에 두라고 한다. 절충안으로 앞에 쓰고 끝에서 한 번 더 말한다.
- 금지문보다 허용 범위를 쓴다. 예: "추측하지 마" 대신 "제공된 자료만 근거로" [공식].
- 시간에 민감한 질문에는 오늘 날짜를 넣는다 [공식].
- "중간에 멈추고 기다려"를 잘 지키지 않고 끝까지 해버린다는 보고가 있다. 그래서 단계를 별도 프롬프트로 나눈다 [커뮤니티].
- 긴 채팅을 계속 이어 쓰면 오래된 맥락을 놓친다. 요약을 받아 새 채팅을 시작한다 [커뮤니티].

**하지 말 것**
- temperature/top_p 조정, prefill 기법은 따르지 않는다. 최신 모델에서는 무시되거나 오류가 난다 [공식].

**도구 기능**
- 규칙 파일은 `GEMINI.md`다.
- `@경로`로 파일을 첨부한다. 앱에서는 Drive 파일을 첨부할 수 있다.
- `/plan`으로 계획부터 받는다.
- `agy`는 Explore → Plan → Execute 흐름과 검증 루프를 권한다 [공식].

출처: https://aistudio.google.com/docs/prompting-strategies, https://aistudio.google.com/docs/long-context, https://aistudio.google.com/docs/whats-new-gemini-3.6, https://geminicli.com/docs/cli/gemini-md/, https://geminicli.com/docs/cli/plan-mode/, https://antigravity.google/docs/cli/best-practices/, https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/

## 4. 작업별 핵심 섹션

| 작업 | 꼭 필요한 섹션 | 팁 |
|---|---|---|
| 기획·설계 문서 | 목적·독자, 확정된 것과 미정인 것, 출력(경로·분량·문체) | 바로 쓰게 하지 말고 인터뷰부터 시킨다. 근거 없는 수치는 [미정]으로 표시하게 한다. Gemini에서는 목차와 본문을 별도 요청으로 나눈다 |
| 기능 개발 | 목표+이유, 따라 할 파일(`@`), 범위·제약, 완료 조건 | 여러 파일에 걸치면 계획부터 받는다 |
| 테스트 | 대상, 따라 할 기존 테스트, 다룰 경우(정상/경계/에러), 완료 조건 | 구현 코드는 그대로 두고, 버그로 보이면 보고만 하게 한다. 실패를 숨기려 테스트를 지우거나 건너뛰지 않게 한다 |
| 버그 수정 | 실제/기대 동작, 재현 절차, 로그(맨 앞) | 실패 테스트로 재현부터 시킨다. 버그와 무관한 정리는 금지한다. 재현 절차가 설명보다 중요하다 [공식, Codex] |
| 긴 작업·자료 조사 | 질문·용도, 범위, 출처 기준, 결과물 형식, 완료 조건 | 확인 못 한 부분은 [미확인]으로 표시하게 한다. 출처를 요구한다. 막히면 무엇이 막혔는지 보고하고 멈추게 한다 (Codex `/goal`) |
| 리팩터링 (나중) | 대상·이유, 불변 조건, 범위 | 전후로 테스트를 돌린다 |
| 코드 리뷰 (나중) | 대상, 보고 기준, 출력 형식 | 수정은 금지하고 보고만 받는다. "중요한 것만"보다 구체적인 기준을 준다 |

## 5. 출처끼리 엇갈리는 점

1. **CLAUDE.md에 폴더 구조를 넣을지.** Claude 공식 문서끼리 충돌한다. 템플릿 앱과는 직접 관련이 없다.
2. **계획을 먼저 받을지.** 커뮤니티는 거의 항상 받으라고 한다. 공식 문서는 복잡하거나 모호한 작업에만 권한다. 그래서 진행 방식을 선택지로 둔다.
3. **검증 지시.** "구체적 명령을 주고 증거를 요구하라"는 권장되고, "double-check 해"는 해롭다. 템플릿에는 앞의 형태만 쓴다.
4. **Gemini 제약 위치.** 앞 또는 끝. 앞에 쓰고 끝에 한 번 더 말하는 절충안을 쓴다.
5. **테스트 양.** Codex best practices는 테스트를 쓰라고 하고, Astra 가이드는 과한 테스트를 줄이라고 한다. 테스트 범위를 명시하는 것으로 해결한다.
6. **확인하지 못한 것.**
   - 대괄호 라벨, Markdown 제목, XML 사이의 성능 차이
   - 한국어와 영어 프롬프트 사이의 성능 차이
   - 사용자 프롬프트 안에 역할을 지정하는 것("너는 시니어 엔지니어야")의 효과
