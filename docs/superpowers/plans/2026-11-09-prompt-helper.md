# 프롬프트 헬퍼 첫 버전 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단축키로 AI별 프롬프트 템플릿을 꺼내 빈칸을 채우고 붙여넣는 맥(검증)·윈도우(코드만) 메뉴바 앱의 첫 버전을 만든다.

**Architecture:**
- 로직은 TypeScript의 순수 모듈(`src/core`)에 모으고 vitest로 테스트한다.
- 항상 떠 있는 `overlay` 창 하나가 컨트롤러, 검색 팝업, 채우기 창을 함께 맡는다. 편집 창과 토스트 창은 필요할 때만 만든다.
- Rust(`src-tauri`)는 OS 다리 역할만 한다: 전역 단축키, 클립보드, 키 입력 흉내, 포커스 되돌리기, 권한, 파일 저장.

**Tech Stack:**
- Tauri 2.12, React 19, TypeScript (create-tauri-app의 react-ts 템플릿이 정한 버전), Vite, vitest, ESLint
- Rust 크레이트: tauri-plugin-global-shortcut 2.4, tauri-plugin-clipboard-manager 2.5, tauri-plugin-autostart 2.7, tauri-plugin-opener 2.7, tauri-plugin-single-instance 2.5, enigo 0.6, plist 1.10, objc2-app-kit 0.3 (맥), windows 0.62 (윈도우)

**Spec:**
- `docs/superpowers/specs/2026-11-09-prompt-helper-design.md` (설계)
- `docs/superpowers/specs/2026-11-09-prompt-helper-default-content.md` (기본 콘텐츠)
- 시안: `docs/superpowers/specs/mockups/`

## Global Constraints

**사용자 규칙**
- 새 패키지·도구 설치 전에 사용자에게 묻는다. 아래 "설치 목록"은 Task 1에서 한 번에 승인받는다. 목록에 없는 것은 따로 묻는다.
- 커밋과 push는 사용자가 요청할 때만 한다. 각 작업의 마지막 단계("체크포인트")는 사용자가 작업별 커밋을 허락한 경우에만 커밋한다.
- 테스트를 지우거나 skip해서 통과시키지 않는다.
- 작업 완료를 말하기 전에 `npm run typecheck`, `npm run lint`, `npm test`, `cargo clippy -- -D warnings`, `cargo test`를 실행한다. 실행하지 못했으면 그렇게 말한다.
- 코드와 주석은 영어, 앱 UI 문구는 한국어로 쓴다.
- 비밀 값(.env, 키, 토큰)은 커밋하거나 출력하지 않는다.

**스택과 플랫폼**
- 스택은 Tauri 2 + React + TypeScript다. Electron은 쓰지 않는다. Rust는 OS 기능에만 쓰고, Rust 코드에는 무엇을 왜 하는지 주석을 단다.
- 맥은 실행까지 검증한다. 윈도우는 코드만 쓴다: 윈도우 전용 코드는 `#[cfg(target_os = "windows")]`로 나누고, 완료 보고와 README에 "실행 검증 안 됨"이라고 적는다.
- 맥에서는 Dock 아이콘 없이 메뉴바 앱으로 동작한다(Accessory activation policy).

**모드와 템플릿 표기**
- 모드는 `claude` / `codex` / `gemini` 세 가지다.
  - 표시 이름: Claude Code / Codex / Gemini
  - 메뉴바 약칭: CC / CX / GM
  - 규칙 파일: CLAUDE.md / AGENTS.md / GEMINI.md
- 템플릿 표기 규칙:
  - 섹션 제목은 `## 제목`
  - 빈칸은 `{힌트}`
  - 자동 변수는 `{{today}}`(YYYY-MM-DD)와 `{{rulesFile}}`

**기본 콘텐츠와 단축키**
- 기본 콘텐츠(템플릿 15개, 문구 17개, 가이드 10항목과 출처)는 기본 콘텐츠 문서의 텍스트를 그대로 옮긴다. 고치려면 사용자에게 먼저 묻는다.
- 기본 단축키(정식 표기): 템플릿 `Control+Alt+Digit1`~`Digit5`, 검색 팝업 `Control+Alt+KeyP`, 모드 전환 `Control+Alt+KeyM`
  - 화면 표시: 맥 `⌃⌥1`, 윈도우 `Ctrl+Alt+1`

**데이터**
- 앱 데이터 폴더의 `data.json` 하나에 저장한다. `schemaVersion: 1`을 둔다.
- 기본 템플릿을 사용자가 고친 내용은 수정분(override)으로 따로 저장한다.

**반목표**
- 무거운 상주 앱
- 원래 클립보드를 잃는 것
- 흔한 단축키를 말없이 가로채는 것
- 예전 요령("step by step", "IMPORTANT", "꼼꼼히")이 들어간 템플릿

## 설치 목록 (Task 1에서 사용자 승인)

- **Rust 툴체인 (stable).** rustup으로 설치한다. 설치 명령은 사용자가 직접 실행한다. Xcode는 이미 있다.
- **npm 패키지 (`npm create tauri-app@4.7.5`의 react-ts 템플릿이 설치하는 것)**
  - react, react-dom, vite, @vitejs/plugin-react, typescript
  - @tauri-apps/api, @tauri-apps/cli
- **npm 패키지 (추가)**
  - @tauri-apps/plugin-autostart, @tauri-apps/plugin-opener
  - 개발용: vitest, eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, globals
- **Rust 크레이트**
  - tauri-plugin-global-shortcut, tauri-plugin-clipboard-manager, tauri-plugin-autostart, tauri-plugin-opener, tauri-plugin-single-instance
  - enigo, plist, serde, serde_json
  - 맥 전용: objc2, objc2-app-kit, objc2-foundation
  - 윈도우 전용: windows
- **(Task 17, 선택)** `rustup target add x86_64-pc-windows-msvc`: 윈도우 코드 컴파일 확인용

## Review Focus

테스트가 직접 잡지 못하지만 사용자를 가장 먼저 괴롭힐 다섯 가지다. 줄마다 담당 작업에 테스트나 점검을 넣었다.

1. **한글 입력 조합 중 Enter/Tab/⌘Enter.** 조합 중(`isComposing`)인 키는 조합 완료로만 쓰이고, 항목 선택·붙여넣기·빈칸 이동이 일어나지 않아야 한다. → Task 13, 14 테스트
2. **⌘C/⌘V/⌘Z/⌘A가 채우기 창과 편집 창 입력란에서 동작해야 한다.** 이 앱은 메뉴바 앱이라 메뉴가 화면에 보이지 않는다. → Task 1 Edit 메뉴 설정, Task 13·15 수동 점검
3. **채우기 창에 중괄호가 든 로그나 JSON을 붙여넣어도** 남은 빈칸 수와 Tab 이동은 원래 템플릿의 빈칸만 센다. → Task 3, 13 테스트
4. **채우기 창에 작성 중인 내용이 있는데 다른 템플릿 단축키를 누르면** 확인 없이 내용을 버리지 않는다. → Task 13 테스트
5. **붙여넣기 전 클립보드에 이미지가 있었다면** 붙여넣기 후에도 이미지가 남아 있어야 한다. 텍스트와 이미지 외의 형식은 README에 한계로 적는다. → Task 10 수동 점검

---

## 파일 구조

```
package.json · vite.config.ts · tsconfig*.json · eslint.config.js · README.md
overlay.html · editor.html · toast.html          # Vite 멀티 페이지 진입점 (index.html 삭제)
src/
  core/                 # 순수 로직. Tauri import 금지. vitest 대상
    types.ts            # 공용 타입
    modes.ts            # MODES, MODE_INFO, nextMode
    defaults/templates.ts · phrases.ts · guide.ts   # 기본 콘텐츠 (문서 그대로)
    render.ts           # 자동 변수 치환, 모드 본문 선택
    placeholders.ts     # {빈칸} 찾기·이동
    hotkeys.ts          # 단축키 표기, 녹화, 충돌 판정, 플랫폼
    data.ts             # 저장 형식 ↔ 앱 데이터 병합, 검증
    search.ts           # 검색 팝업 결과, 최근 사용
    guideLookup.ts      # 커서 위치 → 가이드 항목
    actions.ts          # 단축키·메뉴 동작 → 할 일 결정
    messages.ts         # 토스트 문구
    menuModel.ts        # 트레이 메뉴 구조
    fillState.ts        # 채우기 창 상태 리듀서
    paletteState.ts     # 검색 팝업 키 처리
    editing.ts          # 편집 창의 데이터 변경 함수
  bridge/
    commands.ts         # Rust 커맨드 invoke 래퍼
    events.ts           # 이벤트 이름과 listen/emit 래퍼
    store.ts            # loadAppData / saveAppData
  controller/controller.ts · tray.ts   # overlay 창에서 도는 백그라운드 로직
  overlay/OverlayApp.tsx · overlayStore.ts · FillView.tsx · PaletteView.tsx
  editor/EditorApp.tsx · TemplatesTab.tsx · PhrasesTab.tsx · SettingsTab.tsx · GuidePanel.tsx · HotkeyRecorder.tsx
  toast/ToastApp.tsx
  ui/HighlightedTextarea.tsx · theme.css
  main-overlay.tsx · main-editor.tsx · main-toast.tsx
src-tauri/
  tauri.conf.json · capabilities/default.json · Cargo.toml
  src/main.rs · lib.rs
  src/storage.rs · system_shortcuts.rs · permissions.rs · focus.rs · paste.rs · shortcuts.rs · app_windows.rs
```

**Rust 커맨드와 TS 래퍼 대응** (`src/bridge/commands.ts`, 함수 이름은 camelCase)

| Rust 커맨드 | TS 래퍼 시그니처 |
|---|---|
| `load_data` | `loadData(): Promise<string \| null>` |
| `save_data` | `saveData(json: string): Promise<void>` |
| `backup_data` | `backupData(): Promise<string \| null>` |
| `read_system_shortcuts` | `readSystemShortcuts(): Promise<string[]>` |
| `check_accessibility` | `checkAccessibility(): Promise<boolean>` |
| `open_accessibility_settings` | `openAccessibilitySettings(): Promise<void>` |
| `remember_frontmost` | `rememberFrontmost(): Promise<void>` |
| `restore_focus` | `restoreFocus(): Promise<void>` |
| `paste_text` | `pasteText(text: string): Promise<'pasted' \| 'copiedOnly'>` |
| `set_shortcuts` | `setShortcuts(b: Binding[]): Promise<RegistrationFailure[]>` |
| `show_overlay` | `showOverlay(view: 'palette' \| 'fill'): Promise<void>` |
| `hide_overlay` | `hideOverlay(): Promise<void>` |
| `open_editor` | `openEditor(tab?: 'templates' \| 'phrases' \| 'settings'): Promise<void>` |
| `show_toast` | `showToast(message: string): Promise<void>` |
| `quit_app` | `quitApp(): Promise<void>` |

**이벤트** (`src/bridge/events.ts`)

| 이벤트 | 내용 |
|---|---|
| `shortcut-triggered` | `{ actionId: string }`. Rust → overlay |
| `data-changed` | `{ source: 'controller' \| 'editor' }` |
| `registration-result` | `{ failures: RegistrationFailure[] }`. controller → editor |
| `toast-message` | `string`. Rust → toast |
| `editor-tab` | `'templates' \| 'phrases' \| 'settings'`. Rust → editor |

---

### Task 1: 프로젝트 뼈대와 검증 도구

**Files:**
- Create: Tauri 템플릿 전체, `overlay.html`, `editor.html`, `toast.html`, `src/main-overlay.tsx`, `src/main-editor.tsx`, `src/main-toast.tsx`, `eslint.config.js`
- Modify: `vite.config.ts`, `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`
- Delete: 템플릿의 `index.html`, `src/App.tsx`, `src/main.tsx`, 예제 asset

**Interfaces:**
- Produces:
  - 창 라벨 `overlay`(설정 파일에 선언, 숨김 시작), `editor`·`toast`(나중에 코드로 생성)
  - npm 스크립트 `typecheck` / `lint` / `test` / `tauri`
  - `src-tauri/src/lib.rs`의 `run()`: 이후 작업이 플러그인·커맨드를 여기에 등록한다

- [ ] **Step 1: 설치 승인받기**
  - 위 "설치 목록"을 사용자에게 보여 주고 승인을 받는다.
  - Rust는 사용자가 직접 설치하도록 안내한다: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
  - 함께 물을 것: git 저장소를 만들지(`git init`), 작업별 커밋을 허락하는지.
- [ ] **Step 2: Rust 설치 확인**
  - Run: `rustc --version && cargo --version`
  - Expected: 둘 다 버전이 출력된다.
- [ ] **Step 3: 템플릿 생성**
  - 스크래치 폴더에서 `npm create tauri-app@4.7.5 -- prompt-helper --template react-ts --manager npm --identifier dev.prompthelper.app --yes`를 실행한다.
    - 이 버전에 없는 옵션이 있으면 대화형 질문에서 같은 값을 고른다. 템플릿 react-ts, 패키지 매니저 npm, identifier `dev.prompthelper.app`이다.
  - 생성된 내용을 레포 루트로 옮긴다. `docs/`와 `.superpowers/`는 건드리지 않는다.
  - 앱 이름은 `Prompt Helper`(productName)로 한다.
  - 이어서 `npm install`을 실행하고, 추가 npm 패키지와 Rust 크레이트를 설치한다.
- [ ] **Step 4: Vite 멀티 페이지와 테스트·린트 설정**
  - `vite.config.ts`의 `build.rollupOptions.input`에 `overlay`, `editor`, `toast` 세 HTML을 넣는다.
  - vitest 설정: `test: { include: ['src/**/*.test.ts'], environment: 'node' }`
  - package.json 스크립트:
    - `"typecheck": "tsc --noEmit -p ."`
    - `"lint": "eslint ."`
    - `"test": "vitest run"`
  - `eslint.config.js`는 flat config로 쓴다: `@eslint/js` recommended + `typescript-eslint` recommended + `react-hooks` recommended. `dist`와 `src-tauri/target`은 제외한다.
  - typescript-eslint가 템플릿의 TypeScript 버전을 지원하는지 설치 단계에서 확인한다. 지원하지 않으면 사용자에게 알리고 버전을 맞춘다.
- [ ] **Step 5: 창과 앱 동작 설정**
  - `tauri.conf.json`의 `app.windows`에는 `overlay` 하나만 둔다. 설정값:
    - `url: "overlay.html"`, `visible: false`, `decorations: false`, `alwaysOnTop: true`, `skipTaskbar: true`, `resizable: false`
    - `width: 680`, `height: 520`
  - `capabilities/default.json`:
    - 적용 창: `["overlay","editor","toast"]`
    - 권한: `core:default`, `core:window:default`, `core:window:allow-hide`, `core:window:allow-show`, `core:window:allow-set-focus`, `core:menu:default`, `core:tray:default`, `core:event:default`, `opener:allow-open-url`, `autostart:allow-enable`, `autostart:allow-disable`, `autostart:allow-is-enabled`
  - `lib.rs`:
    - single-instance 플러그인을 가장 먼저 등록한다. 두 번째 실행 시에는 `open_editor` 동작을 한다(Task 15에서 연결).
    - 이어서 global-shortcut, clipboard-manager, autostart(`MacosLauncher::LaunchAgent`), opener를 등록한다.
    - 맥 `setup`에서 `app.set_activation_policy(ActivationPolicy::Accessory)`를 호출한다.
    - **Edit 메뉴가 있는 앱 메뉴를 설정한다**(Review Focus 2): Undo, Redo, Cut, Copy, Paste, Select All을 PredefinedMenuItem으로 넣는다.
- [ ] **Step 6: 세 진입점 만들기**
  - 각 진입점은 빈 React 컴포넌트를 렌더링한다(`OverlayApp`, `EditorApp`, `ToastApp` 자리).
  - `src/ui/theme.css`에 어두운 테마 기본 변수를 둔다. 시안 `mockups/editor.html`의 색을 참고한다.
- [ ] **Step 7: 검증**
  - Run: `npm run typecheck && npm run lint && npm test -- --passWithNoTests && (cd src-tauri && cargo clippy -- -D warnings)`
  - Expected: 모두 통과한다.
  - Run: `npm run tauri dev`
  - Expected: 빌드된다. Dock 아이콘과 창은 보이지 않고, 프로세스는 살아 있다. 터미널에서 Ctrl+C로 끈다.
- [ ] **Step 8: 체크포인트**
  - git을 쓰기로 했다면 `.gitignore`에 `node_modules/`, `dist/`, `src-tauri/target/`, `.superpowers/`를 넣는다.
  - 커밋은 사용자가 허락한 경우에만 한다: `chore: scaffold tauri app`

### Task 2: 핵심 타입, 기본 콘텐츠, 렌더링

**Files:**
- Create: `src/core/types.ts`, `src/core/modes.ts`, `src/core/defaults/templates.ts`, `src/core/defaults/phrases.ts`, `src/core/defaults/guide.ts`, `src/core/render.ts`
- Test: `src/core/render.test.ts`, `src/core/defaults/defaults.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type Mode = 'claude' | 'codex' | 'gemini';
  export type Platform = 'mac' | 'windows';
  export type Bodies = Record<Mode, string>;
  export interface Template { id: string; name: string; builtIn: boolean; hidden: boolean; order: number; bodies: Bodies }
  export const PHRASE_CATEGORIES = ['진행 방식', '범위', '보고·검증', '자료·맥락', '출력'] as const;
  export type PhraseCategory = typeof PHRASE_CATEGORIES[number];
  export interface Phrase { id: string; text: string; category: PhraseCategory; recommendedModes: Mode[] | 'all'; order: number }
  export type ActionId = `template:${string}` | 'palette' | 'cycleMode';
  export type InsertMode = 'fill' | 'direct';
  export interface ItemRef { kind: 'template' | 'phrase'; id: string }
  export interface Settings { mode: Mode; insertMode: InsertMode; launchAtLogin: boolean; bindings: Partial<Record<ActionId, string | null>>; recent: ItemRef[] }
  export interface AppData { settings: Settings; templates: Template[]; phrases: Phrase[] }
  export type GuideKey = 'goal' | 'context' | 'material' | 'scope' | 'done' | 'output' | 'process' | 'symptom' | 'cases' | 'general';
  export interface GuideEntry { key: GuideKey; title: string; why: string; good: string; bad: string;
    tips: Partial<Record<Mode | 'all', string>>; sources: { claude: string } & Partial<Record<'codex' | 'gemini', string>> }
  ```
- Produces (`modes.ts`):
  - `MODES: readonly Mode[]` (순서 claude, codex, gemini)
  - `MODE_INFO: Record<Mode, { label: string; short: 'CC' | 'CX' | 'GM'; rulesFile: string }>`
  - `nextMode(m: Mode): Mode`
- Produces (`defaults/*`):
  - `DEFAULT_TEMPLATES: Template[]`
    - id 순서: `plan-doc`, `feature`, `test`, `bugfix`, `research`
    - 이름: 기획 문서, 기능 개발, 테스트, 버그 수정, 긴 작업 · 자료 조사
  - `DEFAULT_PHRASES: Phrase[]`: id `p01`~`p17`. 기본 콘텐츠 문서 2절 표 순서를 따른다.
  - `GUIDE_ENTRIES: Record<GuideKey, GuideEntry>`: 기본 콘텐츠 문서 3절과 3.1절을 옮긴다.
  - `HEADING_TO_GUIDE: Record<string, GuideKey>`: 3절 표의 "연결 제목"을 옮긴다. "템플릿 마지막 문장"은 제외한다(Task 7이 처리).
- Produces (`render.ts`):
  - `renderText(text: string, ctx: { today: string; mode: Mode }): string`
  - `resolveBody(t: Template, mode: Mode): { body: string; fellBack: boolean }`
  - `todayString(d: Date): string`

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```ts
  // render.test.ts
  const ctx = { today: '2026-11-09', mode: 'codex' as const };
  expect(renderText('날짜 {{today}} / {{rulesFile}}', ctx)).toBe('날짜 2026-11-09 / AGENTS.md');
  expect(renderText('{무엇을} {{unknown}}', ctx)).toBe('{무엇을} {{unknown}}');
  const t = { ...DEFAULT_TEMPLATES[1], bodies: { ...DEFAULT_TEMPLATES[1].bodies, codex: '  \n' } };
  expect(resolveBody(t, 'codex')).toEqual({ body: t.bodies.claude, fellBack: true });
  expect(resolveBody(t, 'claude').fellBack).toBe(false);
  expect(todayString(new Date(2026, 0, 5))).toBe('2026-01-05');
  expect(nextMode('gemini')).toBe('claude');

  // defaults.test.ts
  expect(DEFAULT_TEMPLATES.map(t => t.id)).toEqual(['plan-doc','feature','test','bugfix','research']);
  for (const t of DEFAULT_TEMPLATES) for (const m of MODES) expect(t.bodies[m].trim()).not.toBe('');
  for (const t of DEFAULT_TEMPLATES) for (const m of MODES) expect(t.bodies[m]).not.toMatch(/step by step|IMPORTANT|꼼꼼히/i);
  // feature/claude가 기본 콘텐츠 문서 1.2절 Claude Code 블록과 글자 하나까지 같은지 확인한다 (옮겨 적기 고정)
  expect(DEFAULT_TEMPLATES[1].bodies.claude).toBe(FEATURE_CLAUDE_EXPECTED);
  expect(DEFAULT_PHRASES).toHaveLength(17);
  expect(DEFAULT_PHRASES.find(p => p.text.includes('{{rulesFile}}'))?.recommendedModes).toBe('all');
  for (const p of DEFAULT_PHRASES) expect(PHRASE_CATEGORIES).toContain(p.category);
  for (const k of Object.keys(GUIDE_ENTRIES)) expect(GUIDE_ENTRIES[k as GuideKey].sources.claude).toMatch(/^https:\/\//);
  ```
  `FEATURE_CLAUDE_EXPECTED`는 테스트 파일 안에 문서 블록을 그대로 붙여 넣은 문자열이다.
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- src/core`
  - Expected: FAIL (모듈 없음)
- [ ] **Step 3: 구현**
  - 기본 콘텐츠 문서 1~3절을 그대로 옮긴다.
  - 문구 "작업 전에 {규칙 파일}을 먼저 읽어줘"는 `작업 전에 {{rulesFile}}을 먼저 읽어줘`로 옮긴다.
  - 표의 "전체"는 `'all'`로 옮긴다.
  - `renderText`는 `{{today}}`와 `{{rulesFile}}`만 바꾼다.
- [ ] **Step 4: 통과 확인**
  - Run: `npm test -- src/core && npm run typecheck`
  - Expected: PASS
- [ ] **Step 5: 체크포인트** — `feat(core): types, default content, rendering`

### Task 3: 빈칸 찾기와 이동

**Files:**
- Create: `src/core/placeholders.ts`
- Test: `src/core/placeholders.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Range { start: number; end: number } // end exclusive, includes braces
  export function findPlaceholders(text: string, only?: ReadonlySet<string>): Range[];
  export function placeholderSet(text: string): Set<string>;
  export function nextPlaceholder(text: string, from: number, dir: 1 | -1, only?: ReadonlySet<string>): Range | null;
  ```
- 빈칸의 정의:
  - 한 줄 안의 `{…}`이다. 내용에는 `{`, `}`, 줄바꿈이 없다.
  - 빈 내용 `{}`도 빈칸이다.
  - `{{…}}`의 일부는 빈칸이 아니다.
  - `only`가 주어지면 그 집합에 있는 문자열과 똑같은 것만 센다.
- `nextPlaceholder`의 동작:
  - `dir 1`: `start >= from`인 첫 빈칸
  - `dir -1`: `end <= from`인 마지막 빈칸
  - 없으면 반대쪽 끝으로 돌아간다. 빈칸이 하나도 없으면 `null`을 돌려준다.

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```ts
  const t = '## 목표\n{무엇을} — 이유: {왜}\n- 포함: {}\n날짜 {{today}}';
  expect(findPlaceholders(t).map(r => t.slice(r.start, r.end))).toEqual(['{무엇을}', '{왜}', '{}']);
  expect(findPlaceholders('{a\nb}')).toEqual([]);
  // Review Focus 3: 나중에 붙여넣은 JSON은 원래 빈칸 집합에 없으므로 세지 않는다
  const known = placeholderSet(t);
  const edited = t.replace('{왜}', '로그 {"code":401}');
  expect(findPlaceholders(edited, known).map(r => edited.slice(r.start, r.end))).toEqual(['{무엇을}', '{}']);
  const r1 = findPlaceholders(t)[0];
  expect(nextPlaceholder(t, r1.end, 1)).toEqual(findPlaceholders(t)[1]);
  expect(nextPlaceholder(t, t.length, 1)).toEqual(r1);          // wrap
  expect(nextPlaceholder(t, r1.start, -1)).toEqual(findPlaceholders(t)[2]); // wrap backwards
  expect(nextPlaceholder('빈칸 없음', 0, 1)).toBeNull();
  ```
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- placeholders`
  - Expected: FAIL
- [ ] **Step 3: 구현**
  - 정규식 `/(?<!\{)\{[^{}\n]*\}(?!\})/g`로 찾는다.
  - 기본 템플릿 15개 모두에서 `{{` 앞뒤 경계가 맞는지 테스트 하나를 더 추가한다: 각 본문의 `findPlaceholders` 결과에 `{{`가 들어간 항목이 없어야 한다.
- [ ] **Step 4: 통과 확인**
  - Run: `npm test -- placeholders`
  - Expected: PASS
- [ ] **Step 5: 체크포인트** — `feat(core): placeholder detection`

### Task 4: 단축키 표기, 녹화, 충돌 판정

**Files:**
- Create: `src/core/hotkeys.ts`
- Test: `src/core/hotkeys.test.ts`

**Interfaces:**
- Consumes: `ActionId`, `Platform` (Task 2)
- Produces:
  ```ts
  export const DEFAULT_BINDINGS: Record<ActionId, string>; // template:plan-doc→Control+Alt+Digit1 … template:research→Control+Alt+Digit5, palette→Control+Alt+KeyP, cycleMode→Control+Alt+KeyM
  export function acceleratorFromKeyEvent(e: { code: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean }): string | null;
  export function formatAccelerator(acc: string, platform: Platform): string;
  export type ConflictKind = 'internal' | 'system' | 'common' | 'registration';
  export interface Conflict { kind: ConflictKind; detail: string }
  export function findConflicts(acc: string, forAction: ActionId, bindings: Settings['bindings'], systemShortcuts: readonly string[], platform: Platform): Conflict[];
  export const COMMON_SHORTCUTS: Record<Platform, readonly string[]>;
  export function detectPlatform(userAgent: string): Platform;
  export function isPrimaryMod(e: { metaKey: boolean; ctrlKey: boolean }, platform: Platform): boolean; // mac: meta, windows: ctrl
  ```
- **정식 표기**
  - 수정키를 `Control`, `Alt`, `Shift`, `Super` 순서로 쓰고, 뒤에 `KeyboardEvent.code`(`KeyP`, `Digit1`, `Space`)를 붙인다. `metaKey`는 `Super`다.
  - 이 문자열을 그대로 Rust global-shortcut 플러그인에 넘긴다.
- **녹화 규칙**: `Control`, `Alt`, `Super` 중 하나 이상이 있어야 한다. Shift만 있거나 수정키가 없으면 `null`이다. 수정키 자체(`AltLeft` 등)도 `null`이다.
- **COMMON_SHORTCUTS**
  - mac: `Super+KeyC/V/X/Z/A/S/Q/W/T/N`, `Super+Space`, `Super+Tab`, `Super+Alt+Digit1/2/3`, `Alt+Space`, `Control+Space`
  - windows: `Control+KeyC/V/X/Z/A/S`, `Alt+Space`, `Alt+Tab`, `Alt+F4`, `Super+KeyL/D/E`, `Control+Alt+Delete`

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```ts
  const ev = (code: string, m: Partial<Record<'ctrlKey'|'altKey'|'shiftKey'|'metaKey', boolean>> = {}) =>
    ({ code, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...m });
  expect(acceleratorFromKeyEvent(ev('KeyP', { ctrlKey: true, altKey: true }))).toBe('Control+Alt+KeyP');
  expect(acceleratorFromKeyEvent(ev('KeyA'))).toBeNull();
  expect(acceleratorFromKeyEvent(ev('KeyA', { shiftKey: true }))).toBeNull();
  expect(acceleratorFromKeyEvent(ev('AltLeft', { altKey: true }))).toBeNull();
  expect(formatAccelerator('Control+Alt+Digit2', 'mac')).toBe('⌃⌥2');
  expect(formatAccelerator('Control+Alt+Digit2', 'windows')).toBe('Ctrl+Alt+2');
  expect(formatAccelerator('Super+Shift+KeyK', 'mac')).toBe('⇧⌘K');
  expect(findConflicts('Control+Alt+Digit2', 'template:test', DEFAULT_BINDINGS, [], 'mac'))
    .toEqual([{ kind: 'internal', detail: 'template:feature' }]);
  expect(findConflicts('Control+Alt+Digit2', 'template:feature', DEFAULT_BINDINGS, [], 'mac')).toEqual([]);
  expect(findConflicts('Control+Alt+Space', 'palette', DEFAULT_BINDINGS, ['Control+Alt+Space'], 'mac')[0].kind).toBe('system');
  expect(findConflicts('Super+Alt+Digit1', 'palette', DEFAULT_BINDINGS, [], 'mac')[0].kind).toBe('common');
  for (const p of ['mac', 'windows'] as const)
    for (const [id, acc] of Object.entries(DEFAULT_BINDINGS))
      expect(findConflicts(acc, id as ActionId, DEFAULT_BINDINGS, [], p)).toEqual([]);
  expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('mac');
  expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('windows');
  ```
  맥 기호 순서는 ⌃⌥⇧⌘(Control, Alt, Shift, Super)다.
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- hotkeys`
  - Expected: FAIL
- [ ] **Step 3: 구현** — 위 시그니처대로 구현한다.
- [ ] **Step 4: 통과 확인**
  - Run: `npm test -- hotkeys`
  - Expected: PASS
- [ ] **Step 5: 체크포인트** — `feat(core): hotkey format and conflicts`

### Task 5: 저장 데이터 병합과 검증

**Files:**
- Create: `src/core/data.ts`
- Test: `src/core/data.test.ts`

**Interfaces:**
- Consumes: Task 2 타입과 기본값, `DEFAULT_BINDINGS` (Task 4)
- Produces:
  ```ts
  export const SCHEMA_VERSION = 1;
  export interface Defaults { templates: Template[]; phrases: Phrase[] }
  export const DEFAULTS: Defaults;
  export type TemplateOverride = Partial<{ name: string; hidden: boolean; order: number; bodies: Partial<Bodies> }>;
  export interface StoredData { schemaVersion: 1; settings: Partial<Settings>; templateOverrides: Record<string, TemplateOverride>; customTemplates: Template[]; phrases: Phrase[] | null }
  export function defaultSettings(): Settings; // mode 'claude', insertMode 'fill', launchAtLogin true, bindings DEFAULT_BINDINGS, recent []
  export function mergeWithDefaults(stored: StoredData | null, defaults?: Defaults): AppData;
  export function toStored(data: AppData, defaults?: Defaults): StoredData;
  export function resetTemplate(data: AppData, id: string, defaults?: Defaults): AppData;
  export type ParseResult = { ok: true; value: StoredData } | { ok: false; reason: 'invalid-json' | 'unsupported-version' | 'invalid-shape' };
  export function parseStored(raw: string): ParseResult;
  ```
- **병합 규칙**
  - override는 기본 템플릿 위에 필드 단위로 덮는다. 본문은 모드 단위로 덮는다.
  - 기본값에 없는 id의 override는 버린다.
  - `customTemplates`는 그대로 뒤에 붙는다.
  - 최종 목록은 `order`로 정렬한다.
  - settings에 빠진 키는 `defaultSettings()` 값으로 채운다.
  - `phrases`가 `null`이면 기본 문구를 쓴다.
- **toStored**: 기본값과 다른 부분만 기록한다. 문구가 기본 목록과 완전히 같으면 `phrases`를 `null`로 둔다.

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```ts
  const fresh = mergeWithDefaults(null);
  expect(fresh.templates).toHaveLength(5);
  expect(fresh.phrases).toHaveLength(17);
  expect(fresh.settings).toEqual(defaultSettings());
  expect(toStored(fresh)).toEqual({ schemaVersion: 1, settings: expect.any(Object), templateOverrides: {}, customTemplates: [], phrases: null });
  // 사용자 수정은 기본값 업데이트에 덮이지 않는다
  const stored: StoredData = { schemaVersion: 1, settings: {}, templateOverrides: { feature: { bodies: { claude: 'MINE' } } }, customTemplates: [], phrases: null };
  const newDefaults = { ...DEFAULTS, templates: DEFAULTS.templates.map(t => t.id === 'feature' ? { ...t, bodies: { ...t.bodies, codex: 'NEW' } } : t) };
  const merged = mergeWithDefaults(stored, newDefaults).templates.find(t => t.id === 'feature')!;
  expect(merged.bodies.claude).toBe('MINE');
  expect(merged.bodies.codex).toBe('NEW');
  expect(resetTemplate(mergeWithDefaults(stored), 'feature').templates.find(t => t.id === 'feature')).toEqual(DEFAULTS.templates[1]);
  expect(mergeWithDefaults({ ...stored, templateOverrides: { gone: { name: 'x' } } }).templates).toHaveLength(5);
  expect(mergeWithDefaults({ ...stored, settings: { mode: 'gemini' } }).settings.insertMode).toBe('fill');
  expect(parseStored('{oops')).toEqual({ ok: false, reason: 'invalid-json' });
  expect(parseStored('{"schemaVersion":2}')).toEqual({ ok: false, reason: 'unsupported-version' });
  expect(parseStored('{"schemaVersion":1}')).toEqual({ ok: false, reason: 'invalid-shape' });
  const round = toStored(mergeWithDefaults(stored));
  expect(mergeWithDefaults(round)).toEqual(mergeWithDefaults(stored));
  ```
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- data`
  - Expected: FAIL
- [ ] **Step 3: 구현** — 위 규칙대로 구현한다. `parseStored`는 최상위 키 네 개의 타입만 검사한다.
- [ ] **Step 4: 통과 확인**
  - Run: `npm test -- data`
  - Expected: PASS
- [ ] **Step 5: 체크포인트** — `feat(core): stored data merge and validation`

### Task 6: 검색 팝업 결과와 최근 사용

**Files:**
- Create: `src/core/search.ts`
- Test: `src/core/search.test.ts`

**Interfaces:**
- Consumes: `AppData`, `Mode`, `ItemRef`, `ActionId`
- Produces:
  ```ts
  export interface SearchItem { ref: ItemRef; label: string; recommended: boolean; actionId?: ActionId }
  export interface SearchGroup { title: string; items: SearchItem[] }
  export function search(query: string, data: AppData, mode: Mode): SearchGroup[];
  export function flatten(groups: SearchGroup[]): SearchItem[];
  export function pushRecent(recent: readonly ItemRef[], ref: ItemRef, max?: number): ItemRef[]; // max 기본값 5
  ```
- **그룹과 순서**
  - 검색어가 비어 있으면 `최근`(있을 때만)이 먼저 온다.
  - 이어서 `템플릿`, 그다음 `문구 · <분류>`가 `PHRASE_CATEGORIES` 순서로 온다.
  - 빈 그룹은 뺀다.
- **매칭**
  - NFC 정규화와 소문자 변환을 한다.
  - 검색어를 공백으로 나눈 모든 토큰이 라벨에 들어 있어야 한다.
  - 템플릿 라벨은 이름이고, 문구 라벨은 본문이다.
- **추천 표시**
  - `recommended`는 `recommendedModes`가 배열이고 현재 모드를 포함할 때만 참이다.
  - 그룹 안에서는 추천 항목이 먼저 오고, 나머지는 `order` 순서다.
- **제외와 단축키 표시**
  - 숨긴 템플릿은 뺀다.
  - 템플릿 항목의 `actionId`는 `template:<id>`다.

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```ts
  const data = mergeWithDefaults(null);
  const withRecent = { ...data, settings: { ...data.settings, recent: [{ kind: 'phrase', id: 'p02' } as const] } };
  const g0 = search('', withRecent, 'claude');
  expect(g0[0].title).toBe('최근');
  expect(g0[0].items[0].ref).toEqual({ kind: 'phrase', id: 'p02' });
  expect(g0[1].title).toBe('템플릿');
  expect(g0[1].items).toHaveLength(5);
  const labels = flatten(search('계획', data, 'claude')).map(i => i.label);
  expect(labels).toEqual(expect.arrayContaining(['코드 전에 계획을 먼저 보여줘', '계획만 세우고 멈춰줘']));
  expect(search('계획', data, 'claude').some(g => g.title === '템플릿')).toBe(false);
  expect(flatten(search('테스트 보고', data, 'claude')).map(i => i.label)).toEqual(['{테스트 명령} 실행 후 명령과 결과를 보고해줘']);
  const proc = search('', data, 'codex').find(g => g.title === '문구 · 진행 방식')!;
  expect(proc.items[0]).toMatchObject({ label: '확인 질문 없이 맥락에서 판단해서 끝까지 진행해줘', recommended: true });
  const hidden = { ...data, templates: data.templates.map(t => t.id === 'test' ? { ...t, hidden: true } : t) };
  expect(flatten(search('테스트', hidden, 'claude')).some(i => i.ref.kind === 'template')).toBe(false);
  expect(pushRecent([{ kind: 'phrase', id: 'a' }, { kind: 'phrase', id: 'b' }], { kind: 'phrase', id: 'b' }))
    .toEqual([{ kind: 'phrase', id: 'b' }, { kind: 'phrase', id: 'a' }]);
  expect(pushRecent(Array.from({ length: 5 }, (_, i) => ({ kind: 'phrase' as const, id: `x${i}` })), { kind: 'phrase', id: 'n' })).toHaveLength(5);
  ```
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- search`
  - Expected: FAIL
- [ ] **Step 3: 구현** — 위 규칙대로 구현한다.
- [ ] **Step 4: 통과 확인**
  - Run: `npm test -- search`
  - Expected: PASS
- [ ] **Step 5: 체크포인트** — `feat(core): palette search`

### Task 7: 커서 위치로 가이드 항목 찾기

**Files:**
- Create: `src/core/guideLookup.ts`
- Test: `src/core/guideLookup.test.ts`

**Interfaces:**
- Consumes: `GUIDE_ENTRIES`, `HEADING_TO_GUIDE` (Task 2)
- Produces:
  ```ts
  export function guideKeyAt(text: string, cursor: number): GuideKey;
  export function guideFor(key: GuideKey, mode: Mode): { entry: GuideEntry; tips: string[]; source: string };
  ```
- **guideKeyAt 규칙**
  - 블록은 `## ` 제목 줄부터 다음 빈 줄 앞까지다.
  - 커서 줄이 블록 안에 있으면, 그 제목을 `HEADING_TO_GUIDE`로 찾는다. 없으면 `general`이다.
  - 첫 제목보다 앞이면 `material`이다(예: `<error_log>`).
  - 마지막 블록보다 뒤이면 `process`다(추천 끝맺음 문장).
  - 커서가 빈 줄에 있으면 바로 위의 비어 있지 않은 줄을 기준으로 판단한다.
- **guideFor**
  - `tips`는 `[tips.all, tips[mode]]`에서 빈 값을 뺀 것이다.
  - `source`는 `sources[mode] ?? sources.claude`다.

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```ts
  const body = DEFAULT_TEMPLATES.find(t => t.id === 'feature')!.bodies.claude;
  expect(guideKeyAt(body, body.indexOf('## 완료 조건') + 3)).toBe('done');
  expect(guideKeyAt(body, body.indexOf('{관찰 가능한 동작}'))).toBe('done');
  expect(guideKeyAt(body, body.indexOf('코드 전에 계획을'))).toBe('process');
  expect(guideKeyAt(body, body.indexOf('\n\n## 참고') + 1)).toBe('goal'); // blank line → previous block
  const bug = DEFAULT_TEMPLATES.find(t => t.id === 'bugfix')!.bodies.claude;
  expect(guideKeyAt(bug, 2)).toBe('material');
  expect(guideKeyAt('## 메모\n자유롭게', 5)).toBe('general');
  expect(guideKeyAt('## 출력 형식\nx', 3)).toBe('output');
  expect(guideFor('symptom', 'gemini').source).toBe(GUIDE_ENTRIES.symptom.sources.claude);
  expect(guideFor('done', 'codex').source).toBe('https://learn.chatgpt.com/guides/best-practices');
  ```
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- guideLookup`
  - Expected: FAIL
- [ ] **Step 3: 구현** — 위 규칙대로 구현한다.
- [ ] **Step 4: 통과 확인**
  - Run: `npm test -- guideLookup`
  - Expected: PASS
- [ ] **Step 5: 체크포인트** — `feat(core): guide lookup`

### Task 8: 데이터 파일 저장 (Rust)과 불러오기 다리

**Files:**
- Create: `src-tauri/src/storage.rs`, `src/bridge/commands.ts`, `src/bridge/events.ts`, `src/bridge/store.ts`
- Modify: `src-tauri/src/lib.rs` (커맨드 등록)
- Test: `storage.rs` 안의 `#[cfg(test)]`, `src/bridge/store.test.ts`

**Interfaces:**
- Produces (Rust):
  ```rust
  pub fn write_atomic(dir: &Path, name: &str, contents: &str) -> std::io::Result<()>;          // write <name>.tmp then rename
  pub fn backup_file(dir: &Path, name: &str, now_secs: u64) -> std::io::Result<Option<PathBuf>>; // data.json → data.corrupt-<now_secs>.json
  #[tauri::command] fn load_data(app: AppHandle) -> Result<Option<String>, String>;
  #[tauri::command] fn save_data(app: AppHandle, json: String) -> Result<(), String>;
  #[tauri::command] fn backup_data(app: AppHandle) -> Result<Option<String>, String>;
  ```
  - 경로는 `app.path().app_data_dir()/data.json`이다. 폴더가 없으면 만든다.
- Produces (TS):
  - `commands.ts`: 위 "Rust 커맨드와 TS 래퍼 대응" 표의 함수 전부. 아직 없는 커맨드도 시그니처만 먼저 만들어 둔다.
  - `events.ts`: 이벤트 이름 상수, `onShortcut`, `onDataChanged`, `emitDataChanged`, `onRegistrationResult`
  - `store.ts`:
    ```ts
    export async function loadAppData(): Promise<{ data: AppData; recovered: boolean }>;
    // parse 실패 → backupData() 호출 후 기본값, recovered true
    export async function saveAppData(data: AppData, source: 'controller' | 'editor'): Promise<void>;
    // JSON.stringify(toStored(data), null, 2) → saveData → emitDataChanged({ source })
    ```

- [ ] **Step 1: 실패하는 테스트 쓰기**
  - Rust (임시 폴더는 `std::env::temp_dir()` 아래에 고유 이름으로 만든다):
    - `write_atomic` 뒤 내용이 같고, `.tmp` 파일이 남지 않는다.
    - 두 번 쓰면 덮어쓴다.
    - 파일이 없으면 `backup_file`이 `None`을 돌려준다.
    - 파일이 있으면 `data.corrupt-123.json`으로 바뀌고 원래 이름은 사라진다.
  - TS (`vi.mock('./commands')`):
    ```ts
    loadData.mockResolvedValue('{broken'); 
    const r = await loadAppData();
    expect(backupData).toHaveBeenCalledOnce();
    expect(r.recovered).toBe(true);
    expect(r.data).toEqual(mergeWithDefaults(null));
    loadData.mockResolvedValue(null);
    expect((await loadAppData()).recovered).toBe(false);
    ```
- [ ] **Step 2: 실패 확인**
  - Run: `(cd src-tauri && cargo test storage) ; npm test -- store`
  - Expected: FAIL
- [ ] **Step 3: 구현**
  - Rust 함수에는 "왜 원자적으로 쓰는지(중간에 꺼져도 파일이 깨지지 않게)" 주석을 단다.
- [ ] **Step 4: 통과 확인**
  - Run: `(cd src-tauri && cargo test storage) && npm test -- store && npm run typecheck`
  - Expected: PASS
- [ ] **Step 5: 체크포인트** — `feat: data file storage`

### Task 9: 시스템 단축키 읽기와 손쉬운 사용 권한 (Rust)

**Files:**
- Create: `src-tauri/src/system_shortcuts.rs`, `src-tauri/src/permissions.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `system_shortcuts.rs` 안의 `#[cfg(test)]`

**Interfaces:**
- Produces:
  ```rust
  pub fn accelerator_from_symbolic(keycode: u16, modifier_mask: u64) -> Option<String>;
  pub fn parse_symbolic_hotkeys(plist_bytes: &[u8]) -> Vec<String>;
  #[tauri::command] fn read_system_shortcuts() -> Vec<String>;      // mac: ~/Library/Preferences/com.apple.symbolichotkeys.plist, windows: vec![]
  #[tauri::command] fn check_accessibility() -> bool;               // mac: AXIsProcessTrusted(), others: true
  #[tauri::command] fn open_accessibility_settings(app: AppHandle) -> Result<(), String>;
  // opens x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility via opener
  ```
- **수정키 비트**: shift `0x20000`, control `0x40000`, option `0x80000`, command `0x100000`
- **plist 구조**
  - `AppleSymbolicHotKeys.<id>.enabled`
  - `.value.parameters = [ascii, keycode, mask]`
  - enabled가 참이고 parameters가 3개인 항목만 쓴다.
- **keycode → code 표**
  - Space 49
  - A 0, S 1, D 2, F 3, H 4, G 5, Z 6, X 7, C 8, V 9, B 11, Q 12, W 13, E 14, R 15, Y 16, T 17, O 31, U 32, I 34, P 35, L 37, J 38, K 40, N 45, M 46
  - 1 18, 2 19, 3 20, 4 21, 6 22, 5 23, 9 25, 7 26, 8 28, 0 29
  - 표에 없는 keycode는 `None`이다.
- **AXIsProcessTrusted 연결**: ApplicationServices 프레임워크에 직접 `extern "C"`로 연결한다. 새 크레이트를 쓰지 않는다.

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```rust
  assert_eq!(accelerator_from_symbolic(49, 0x40000 | 0x80000).as_deref(), Some("Control+Alt+Space"));
  assert_eq!(accelerator_from_symbolic(35, 0x40000 | 0x80000).as_deref(), Some("Control+Alt+KeyP"));
  assert_eq!(accelerator_from_symbolic(18, 0x100000).as_deref(), Some("Super+Digit1"));
  assert_eq!(accelerator_from_symbolic(200, 0x40000), None);
  // fixture: plist::Value 딕셔너리로 만든 뒤 to_writer_binary로 바이트화
  // id 61 enabled [32,49,786432] → 포함, id 60 disabled → 제외, parameters 없는 id 99 → 제외
  assert_eq!(parse_symbolic_hotkeys(&fixture), vec!["Control+Alt+Space".to_string()]);
  ```
- [ ] **Step 2: 실패 확인**
  - Run: `(cd src-tauri && cargo test system_shortcuts)`
  - Expected: FAIL
- [ ] **Step 3: 구현** — 위 시그니처대로 구현한다.
- [ ] **Step 4: 통과 확인**
  - Run: `(cd src-tauri && cargo test && cargo clippy -- -D warnings)`
  - Expected: PASS
  - 수동 확인: `npm run tauri dev` 상태에서 overlay 개발자 도구 콘솔로 `readSystemShortcuts()`를 실행하면 `Control+Alt+Space`가 들어 있다(이 맥에서 2026-11-09에 확인한 값).
- [ ] **Step 5: 체크포인트** — `feat: system shortcuts and accessibility check`

### Task 10: 단축키로 바로 붙여넣기 (포커스, 붙여넣기, 단축키 등록, 컨트롤러)

**Files:**
- Create: `src-tauri/src/focus.rs`, `src-tauri/src/paste.rs`, `src-tauri/src/shortcuts.rs`, `src/core/actions.ts`, `src/controller/controller.ts`
- Modify: `src-tauri/src/lib.rs`, `src/main-overlay.tsx`
- Test: `src/core/actions.test.ts`

**Interfaces:**
- Consumes: `loadAppData`/`saveAppData` (Task 8), `checkAccessibility` (Task 9), `resolveBody`/`renderText`/`todayString` (Task 2), `pushRecent` (Task 6)
- Produces (Rust):
  ```rust
  // focus.rs — remembered paste target; mac: pid via NSWorkspace.frontmostApplication, windows: HWND
  pub struct RememberedTarget(pub Mutex<Option<FocusTarget>>);   // tauri managed state
  pub fn frontmost() -> Option<FocusTarget>;
  pub fn activate(t: &FocusTarget) -> bool;
  #[tauri::command] fn remember_frontmost(state: State<RememberedTarget>);
  // paste.rs
  pub const RESTORE_DELAY_MS: u64 = 300;
  pub const MODIFIER_WAIT_MAX_MS: u64 = 1000;
  #[derive(Serialize)] #[serde(rename_all = "camelCase")] pub enum PasteOutcome { Pasted, CopiedOnly }
  #[tauri::command] async fn paste_text(app: AppHandle, state: State<'_, RememberedTarget>, text: String) -> Result<PasteOutcome, String>;
  // shortcuts.rs
  #[derive(Deserialize)] #[serde(rename_all = "camelCase")] pub struct Binding { pub action_id: String, pub accelerator: String }
  #[derive(Serialize, Clone)] #[serde(rename_all = "camelCase")] pub struct RegistrationFailure { pub action_id: String, pub accelerator: String, pub message: String }
  #[tauri::command] fn set_shortcuts(app: AppHandle, bindings: Vec<Binding>) -> Vec<RegistrationFailure>;
  ```
- **paste_text 순서**
  1. 권한이 없으면 텍스트만 클립보드에 쓰고 `CopiedOnly`를 돌려준다. 이때 원래 클립보드는 복원하지 않는다.
  2. 원래 클립보드를 백업한다. 텍스트와 이미지 둘 다 시도한다.
  3. 넣을 텍스트를 클립보드에 쓴다.
  4. 기억해 둔 앱을 활성화한다.
  5. 수정키가 모두 떼어질 때까지 최대 `MODIFIER_WAIT_MAX_MS` 기다린다.
     - 맥: CoreGraphics `CGEventSourceFlagsState(1)`에 직접 `extern "C"`로 연결한다.
     - 윈도우: `GetAsyncKeyState`를 쓴다.
  6. enigo로 붙여넣기 키를 보낸다.
     - **keycode로 보낸다**: 맥은 Meta + `Key::Other(9)`, 윈도우는 Control + `Key::Other(0x56)`. 한글 입력 상태에서도 V 키로 인식되게 하려는 것이다.
  7. `RESTORE_DELAY_MS`만큼 기다린 뒤 백업을 복원한다. 이미지였으면 이미지로, 비어 있었으면 비운다.
- **set_shortcuts**
  - 기존 등록을 모두 해제한 뒤 하나씩 등록한다. 실패한 것은 목록으로 돌려준다.
  - `Pressed` 이벤트에서 overlay 창이 보이지 않을 때만 `remember_frontmost`를 한다. 그 뒤 `emit_to("overlay", "shortcut-triggered", { actionId })`를 보낸다.
  - overlay가 보이는 중에 기억하지 않는 이유: 기억하면 붙여넣을 곳이 overlay 자신이 된다.
- **윈도우 포커스**
  - `SetWinEventHook(EVENT_SYSTEM_FOREGROUND)`로 "우리 프로세스와 `Shell_TrayWnd`가 아닌 마지막 전경 창"을 추적한다. 트레이를 클릭하면 작업 표시줄이 전경이 되기 때문이다.
  - `SetForegroundWindow` 제한은 주석으로 남긴다. 실행 검증은 하지 않는다.
- Produces (TS `actions.ts`):
  ```ts
  export interface Binding { actionId: ActionId; accelerator: string }
  export type ActionPlan =
    | { kind: 'fill'; templateId: string; title: string; text: string; fellBack: boolean }
    | { kind: 'paste'; text: string; fellBack: boolean; ref: ItemRef }
    | { kind: 'palette' } | { kind: 'cycleMode'; next: Mode } | { kind: 'none' };
  export function planAction(actionId: string, data: AppData, today: string): ActionPlan;
  export function planPhrase(phraseId: string, data: AppData, today: string): ActionPlan; // paste or none
  export function bindingsToRegister(data: AppData): Binding[]; // non-null, existing & non-hidden templates, palette, cycleMode
  ```
  - fill의 `title`은 `<템플릿 이름> · <모드 표시 이름>` 형식이다.
- Produces (`controller.ts`):
  - `startController(): Promise<void>`. 순서:
    1. `loadAppData`
    2. `setShortcuts(bindingsToRegister)`
    3. `emit registration-result`
    4. `onShortcut` 리스너를 등록한다. `planAction`을 거쳐 각 동작을 실행한다.
       - paste: `pasteText` 후 recent를 갱신하고 `saveAppData(…, 'controller')`
       - cycleMode: 모드를 바꾸고 저장한다
    5. `onDataChanged`에서 source가 `editor`면 다시 불러오고 다시 등록한다.
  - **fill 분기는 이 작업에서 paste로 처리한다.** Task 13에서 채우기 창으로 바꾼다.
  - palette 계획은 Task 14 전까지 무시한다.

- [ ] **Step 1: 실패하는 테스트 쓰기** (`actions.test.ts`)
  ```ts
  const data = mergeWithDefaults(null);
  const p = planAction('template:feature', data, '2026-11-09');
  expect(p).toMatchObject({ kind: 'fill', templateId: 'feature', title: '기능 개발 · Claude Code', fellBack: false });
  expect((p as any).text).toBe(renderText(data.templates[1].bodies.claude, { today: '2026-11-09', mode: 'claude' }));
  const direct = { ...data, settings: { ...data.settings, insertMode: 'direct' as const } };
  expect(planAction('template:feature', direct, '2026-11-09').kind).toBe('paste');
  expect(planAction('cycleMode', data, '')).toEqual({ kind: 'cycleMode', next: 'codex' });
  expect(planAction('palette', data, '')).toEqual({ kind: 'palette' });
  const hidden = { ...data, templates: data.templates.map(t => t.id === 'test' ? { ...t, hidden: true } : t) };
  expect(planAction('template:test', hidden, '').kind).toBe('none');
  expect(bindingsToRegister(hidden).map(b => b.actionId)).not.toContain('template:test');
  expect(planPhrase('p14', { ...data, settings: { ...data.settings, mode: 'gemini' } }, '')).toMatchObject({ kind: 'paste', text: '작업 전에 GEMINI.md을 먼저 읽어줘' });
  ```
  p14의 기대 문자열은 Task 2의 문구 데이터와 맞춘다.
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- actions`
  - Expected: FAIL
- [ ] **Step 3: 구현** — Rust 세 모듈, `actions.ts`, `controller.ts`를 만든다. `main-overlay.tsx`에서 `startController()`를 한 번 호출한다.
- [ ] **Step 4: 자동 검증**
  - Run: `npm test && npm run typecheck && npm run lint && (cd src-tauri && cargo clippy -- -D warnings)`
  - Expected: PASS
- [ ] **Step 5: 수동 점검 (맥, 사용자 참여 필요)**
  - 준비: `npm run tauri dev`로 실행한다. 사용자가 시스템 설정에서 개발 빌드에 손쉬운 사용 권한을 준다. Claude가 대신 바꿀 수 없다.
  - 다음 결과를 기록한다.
    - TextEdit에서 `⌃⌥2`를 누르면 기능 개발 Claude Code 본문이 들어간다.
    - "hello"를 복사해 둔 뒤 붙여넣기를 하고, 다시 ⌘V를 누르면 "hello"가 나온다.
    - **화면 일부를 이미지로 복사해 둔 뒤 붙여넣기를 하면, 클립보드에 그 이미지가 남아 있다**(Review Focus 5).
    - 한글 입력 상태에서도 정상으로 붙여넣어진다.
    - `⌃⌥`를 길게 누른 채 숫자를 눌러도 정상으로 붙여넣어진다.
    - 터미널의 `claude`에서는 `[Pasted text #1 +N lines]`로 접혀 보이고, 제출하면 전체 내용이 전달된다.
    - `⌃⌥M`을 누른 뒤 `⌃⌥2`를 누르면 Codex 본문이 들어간다.
- [ ] **Step 6: 체크포인트** — `feat: hotkey paste path`

### Task 11: 토스트 창과 안내 문구

**Files:**
- Create: `src/core/messages.ts`, `src/toast/ToastApp.tsx`
- Modify: `src-tauri/src/app_windows.rs` (새로 만듦), `src-tauri/src/lib.rs`, `src/main-toast.tsx`, `src/controller/controller.ts`
- Test: `src/core/messages.test.ts`

**Interfaces:**
- Produces (Rust `app_windows.rs`):
  - `#[tauri::command] fn show_toast(app: AppHandle, message: String) -> Result<(), String>`
  - 동작:
    - `toast` 창이 없으면 만든다: `toast.html`, 320×64, 장식 없음, 항상 위, 작업 표시줄 제외, `focused(false)`.
    - 마우스가 있는 모니터의 오른쪽 위에 16px 여백을 두고 놓는다.
    - `toast-message` 이벤트를 보내고 창을 띄운다.
  - **포커스를 빼앗지 않아야 한다.** 빼앗는다면 원인을 기록하고 사용자에게 알린다.
- Produces (`ToastApp`): 메시지를 받아 2500ms 동안 보여준 뒤 창을 숨긴다.
- Produces (`messages.ts`):
  ```ts
  export function copiedOnlyMessage(p: Platform): string; // mac: '⌘V로 붙여넣으세요 · 권한을 켜면 자동으로 붙여넣어요', windows: 'Ctrl+V로 붙여넣으세요'
  export function fellBackMessage(mode: Mode): string;     // '이 모드(Codex) 버전이 비어 있어 Claude Code 버전을 넣었어요'
  export function modeChangedMessage(mode: Mode): string;  // '모드: Codex'
  ```
- 컨트롤러 연결: `CopiedOnly`, `fellBack`, `cycleMode` 때 `showToast`를 호출한다.

- [ ] **Step 1: 실패하는 테스트 쓰기** — 세 함수의 반환 문자열을 위 값과 비교한다(모드별 1개씩).
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- messages`
  - Expected: FAIL
- [ ] **Step 3: 구현** — 위 동작대로 구현한다.
- [ ] **Step 4: 검증**
  - Run: `npm test && npm run typecheck && npm run lint`
  - Expected: PASS
  - 수동 점검:
    - TextEdit에서 입력하는 중에 `⌃⌥M`을 누르면 "모드: Codex" 토스트가 뜬다. 이때 TextEdit 커서가 그대로라서 계속 입력할 수 있어야 한다.
    - 권한을 끄고 `⌃⌥2`를 누르면 복사 안내 토스트가 뜬다.
- [ ] **Step 5: 체크포인트** — `feat: toast notices`

### Task 12: 메뉴바·트레이 메뉴와 모드 전환

**Files:**
- Create: `src/core/menuModel.ts`, `src/controller/tray.ts`
- Modify: `src-tauri/src/app_windows.rs` (`quit_app`, `open_editor` 추가), `src/controller/controller.ts`
- Test: `src/core/menuModel.test.ts`

**Interfaces:**
- Consumes: `formatAccelerator`, `MODE_INFO`, `PHRASE_CATEGORIES`
- Produces:
  ```ts
  export type MenuNode =
    | { type: 'item'; id: string; text: string; accelerator?: string; checked?: boolean }
    | { type: 'submenu'; text: string; items: MenuNode[] }
    | { type: 'label'; text: string } | { type: 'separator' };
  export function buildMenuModel(data: AppData, platform: Platform, accessibilityOk: boolean): MenuNode[];
  export function trayTitle(mode: Mode): 'CC' | 'CX' | 'GM';
  // item ids: `mode:<mode>`, `template:<id>`, `phrase:<id>`, 'open-accessibility', 'open-editor', 'open-settings', 'quit'
  ```
- **메뉴 구조** (시안 B)
  1. label `모드`, 그 아래 모드 3개(checked)
  2. 구분선
  3. submenu `템플릿`: 숨기지 않은 템플릿. accelerator는 `formatAccelerator`로 표시한다.
  4. submenu `문구`: 분류마다 label을 두고 그 아래 문구를 놓는다.
  5. 구분선
  6. (맥이고 권한이 없을 때만) `손쉬운 사용 권한 켜기…`
  7. `템플릿 편집…`, `설정…`
  8. 구분선
  9. `종료`
- **tray.ts**
  - `syncTray(data, platform, accessibilityOk): Promise<void>`
  - id `main`인 TrayIcon이 있으면 갱신하고, 없으면 만든다. 개발 중 새로고침해도 아이콘이 중복되지 않게 하려는 것이다.
  - 맥은 `setTitle(trayTitle)`, 윈도우는 툴팁 `Prompt Helper · <모드 이름>`을 쓴다.
  - 클릭 처리:
    - mode → 모드 저장 후 `syncTray`
    - template/phrase → `rememberFrontmost()` 후 `planAction`/`planPhrase`
    - open-editor → `openEditor('templates')`
    - open-settings → `openEditor('settings')`
    - open-accessibility → `openAccessibilitySettings()`
    - quit → `quitApp()`
  - `open_editor(tab)` 커맨드도 이 작업에서 만든다.
    - `editor` 창이 없으면 만든다: `editor.html`, 980×640, 장식 있음, 제목 `Prompt Helper`.
    - 있으면 포커스를 준다.
    - `tab` 전달(`editor-tab` 이벤트)과 화면 내용은 Task 15에서 붙인다.

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```ts
  const data = mergeWithDefaults(null);
  const m = buildMenuModel({ ...data, settings: { ...data.settings, mode: 'codex' } }, 'mac', true);
  expect(m.filter(n => n.type === 'item' && n.id.startsWith('mode:')).map(n => (n as any).checked)).toEqual([false, true, false]);
  const tpl = m.find(n => n.type === 'submenu' && n.text === '템플릿') as any;
  expect(tpl.items[1]).toMatchObject({ id: 'template:feature', text: '기능 개발', accelerator: '⌃⌥2' });
  const phr = m.find(n => n.type === 'submenu' && n.text === '문구') as any;
  expect(phr.items.filter((n: MenuNode) => n.type === 'label').map((n: any) => n.text)).toEqual([...PHRASE_CATEGORIES]);
  expect(JSON.stringify(m)).not.toContain('open-accessibility');
  expect(JSON.stringify(buildMenuModel(data, 'mac', false))).toContain('open-accessibility');
  expect(JSON.stringify(buildMenuModel(data, 'windows', false))).not.toContain('open-accessibility');
  expect(trayTitle('gemini')).toBe('GM');
  ```
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- menuModel`
  - Expected: FAIL
- [ ] **Step 3: 구현**
  - `tray.ts`는 `@tauri-apps/api/menu`와 `@tauri-apps/api/tray`로 모델을 그린다.
  - 아이콘은 템플릿 기본 아이콘을 쓴다. 디자인은 빌더 판단이다.
  - 컨트롤러가 시작할 때, 그리고 데이터나 모드가 바뀔 때 `syncTray`를 호출한다.
  - `quit_app`은 `app.exit(0)`이다.
- [ ] **Step 4: 검증**
  - Run: `npm test && npm run typecheck && npm run lint && (cd src-tauri && cargo clippy -- -D warnings)`
  - Expected: PASS
  - 수동 점검:
    - 메뉴바에 `CC`가 보인다.
    - 메뉴에서 Codex를 고르면 `CX`로 바뀌고 체크가 옮겨진다.
    - TextEdit에 커서를 두고 메뉴의 문구를 고르면 TextEdit에 들어간다.
    - `종료`를 누르면 앱이 꺼진다.
- [ ] **Step 5: 체크포인트** — `feat: menubar tray menu and modes`

### Task 13: 채우기 창

**Files:**
- Create: `src/core/fillState.ts`, `src/ui/HighlightedTextarea.tsx`, `src/overlay/overlayStore.ts`, `src/overlay/OverlayApp.tsx`, `src/overlay/FillView.tsx`
- Modify: `src-tauri/src/app_windows.rs` (`show_overlay`, `hide_overlay`), `src/controller/controller.ts`, `src/controller/tray.ts`, `src/main-overlay.tsx`
- Test: `src/core/fillState.test.ts`

**Interfaces:**
- Consumes: `findPlaceholders`, `placeholderSet`, `nextPlaceholder` (Task 3), `isPrimaryMod` (Task 4), `search` (Task 6, ⌘K 목록)
- Produces (Rust):
  - `show_overlay(view)`
    - 크기: palette 600×380, fill 680×520
    - 위치: 마우스가 있는 모니터의 가로 가운데, 위에서 120 logical px
    - 띄운 뒤 포커스를 준다.
  - `hide_overlay()`
- Produces (`fillState.ts`):
  ```ts
  export interface KeyInput { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; isComposing: boolean }
  export interface FillState { templateId: string; title: string; initial: string; text: string; known: Set<string>;
    selection: Range; confirmSubmit: boolean; pendingReplace: { templateId: string; title: string; text: string } | null; phraseSearch: boolean }
  export type FillEvent =
    | { type: 'open'; templateId: string; title: string; text: string }
    | { type: 'edit'; text: string; selection: Range }
    | { type: 'key'; input: KeyInput }
    | { type: 'insertPhrase'; text: string }
    | { type: 'confirmReplace' } | { type: 'cancelReplace' };
  export type FillEffect = { type: 'none' } | { type: 'select'; range: Range } | { type: 'paste'; text: string } | { type: 'close' };
  export function fillReducer(s: FillState | null, e: FillEvent, platform: Platform): { state: FillState | null; effect: FillEffect };
  export function remainingBlanks(s: FillState): number;
  ```
- **리듀서 규칙**
  - **open**
    - 상태가 없거나 `text === initial`이면 새 상태를 만든다. `known = placeholderSet(text)`이고, 첫 빈칸을 select한다.
    - 작성 중인 내용이 있으면 `pendingReplace`만 설정한다(Review Focus 4).
  - **key**
    - `isComposing`이면 아무것도 하지 않는다(Review Focus 1).
    - `pendingReplace`가 있을 때: Enter → confirmReplace, Esc → cancelReplace.
    - Tab / Shift+Tab: `known` 안에서만 `nextPlaceholder`로 select한다.
    - primary+Enter:
      - 남은 빈칸이 있고 `confirmSubmit`이 거짓이면, `confirmSubmit`만 참으로 바꾼다.
      - 그 외에는 `paste` 효과를 내고 상태를 `null`로 만든다.
    - primary+K: `phraseSearch`를 참으로 바꾼다.
    - Esc: `phraseSearch`가 켜져 있으면 끄고, 아니면 `close` 효과를 내고 상태를 `null`로 만든다.
    - 그 밖의 키: `none`
  - **edit**: `confirmSubmit`을 거짓으로 되돌린다.
  - **insertPhrase**
    - 선택 영역을 문구로 바꾼다.
    - 문구 안의 빈칸을 `known`에 더한다.
    - `phraseSearch`를 끈다.
- **UI**
  - `HighlightedTextarea`: textarea 뒤에 같은 글꼴과 줄바꿈을 쓰는 div를 두고, `known` 빈칸에 색을 입힌다. 새 패키지는 쓰지 않는다.
  - `FillView` 구성:
    - 제목: `title`
    - 본문 입력란
    - `confirmSubmit`이면 "빈칸 N개가 남았어요 · ⌘Enter를 한 번 더 누르면 그대로 붙여넣어요"
    - `pendingReplace`이면 "작성 중인 내용을 버리고 '<새 제목>'으로 바꿀까요? Enter 바꾸기 · Esc 계속 작성"
    - 아래 안내: `Tab 다음 빈칸 · ⌘Enter 붙여넣기 · ⌘K 문구 · Esc 취소` (윈도우는 Ctrl)
    - ⌘K 목록: `search(query, data, mode)`의 문구 그룹만 쓴다.
  - **채우기 창은 blur 때 숨기지 않는다.** 사용자가 다른 앱에서 로그를 복사해 올 수 있다.
- **컨트롤러 변경**
  - fill 계획이 오면 `overlayStore`에 open을 보내고 `showOverlay('fill')`을 호출한다.
  - paste 효과: `hideOverlay` → `pasteText` → 토스트·최근 사용 처리
  - close 효과: `hideOverlay` → 기억해 둔 앱으로 포커스를 돌린다. `paste_text`의 활성화 로직을 `restore_focus` 커맨드로 분리해서 재사용한다.
  - 채우기 창이 떠 있을 때 palette 동작이 오면, `key: primary+K`를 보내 문구 검색을 연다.
  - Task 10의 "fill을 paste로 처리" 임시 분기를 없앤다.

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```ts
  const k = (key: string, m: Partial<KeyInput> = {}): FillEvent => ({ type: 'key', input: { key, metaKey: false, ctrlKey: false, shiftKey: false, isComposing: false, ...m } });
  const text = '## 목표\n{무엇을} — 이유: {왜}';
  let r = fillReducer(null, { type: 'open', templateId: 'feature', title: 'T', text }, 'mac');
  expect(r.effect).toEqual({ type: 'select', range: findPlaceholders(text)[0] });
  r = fillReducer(r.state, k('Tab'), 'mac');
  expect(r.effect).toEqual({ type: 'select', range: findPlaceholders(text)[1] });
  // Review Focus 1: IME 조합 중 Enter/Tab/⌘Enter는 무시
  expect(fillReducer(r.state, k('Enter', { metaKey: true, isComposing: true }), 'mac')).toEqual({ state: r.state, effect: { type: 'none' } });
  // 남은 빈칸 경고 → 두 번째에 붙여넣기
  const w = fillReducer(r.state, k('Enter', { metaKey: true }), 'mac');
  expect(w.state!.confirmSubmit).toBe(true);
  expect(w.effect).toEqual({ type: 'none' });
  expect(fillReducer(w.state, k('Enter', { metaKey: true }), 'mac')).toEqual({ state: null, effect: { type: 'paste', text } });
  // Review Focus 3: 붙여넣은 JSON은 빈칸으로 세지 않음
  const filled = '## 목표\n로그인 — 이유: {"code":401}';
  const e = fillReducer(r.state, { type: 'edit', text: filled, selection: { start: 0, end: 0 } }, 'mac');
  expect(remainingBlanks(e.state!)).toBe(0);
  expect(fillReducer(e.state, k('Enter', { metaKey: true }), 'mac').effect).toEqual({ type: 'paste', text: filled });
  // Review Focus 4: 작성 중 다른 템플릿 → 확인 대기, Esc면 유지
  const p = fillReducer(e.state, { type: 'open', templateId: 'bugfix', title: 'B', text: '{x}' }, 'mac');
  expect(p.state!.text).toBe(filled);
  expect(p.state!.pendingReplace?.templateId).toBe('bugfix');
  expect(fillReducer(p.state, k('Escape'), 'mac').state!.text).toBe(filled);
  expect(fillReducer(p.state, k('Enter'), 'mac').state!.templateId).toBe('bugfix');
  // 윈도우는 Ctrl이 primary
  expect(fillReducer(e.state, k('Enter', { ctrlKey: true }), 'windows').effect.type).toBe('paste');
  // ⌘K 문구 삽입은 빈칸 집합에 추가
  const s = fillReducer(fillReducer(e.state, k('k', { metaKey: true }), 'mac').state, { type: 'insertPhrase', text: '{테스트 명령} 실행 후 명령과 결과를 보고해줘' }, 'mac');
  expect(s.state!.phraseSearch).toBe(false);
  expect(remainingBlanks(s.state!)).toBe(1);
  expect(fillReducer(e.state, k('Escape'), 'mac')).toEqual({ state: null, effect: { type: 'close' } });
  ```
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- fillState`
  - Expected: FAIL
- [ ] **Step 3: 구현** — 리듀서, 하이라이트 입력란, FillView, overlay 표시 커맨드, 컨트롤러 연결을 만든다.
- [ ] **Step 4: 검증**
  - Run: `npm test && npm run typecheck && npm run lint && (cd src-tauri && cargo clippy -- -D warnings)`
  - Expected: PASS
  - 수동 점검 (맥):
    - 터미널의 `claude`에서 `⌃⌥2`를 누르면 채우기 창이 뜨고 첫 빈칸이 선택돼 있다.
    - 한글로 "로그인 추가"를 입력하고 Tab을 누르면 조합이 끝난 뒤 다음 빈칸으로 넘어간다.
    - **⌘V로 로그를 붙여넣을 수 있고, ⌘Z/⌘A/⌘C도 동작한다**(Review Focus 2).
    - 다른 앱으로 가서 복사하고 돌아와도 창과 내용이 그대로다.
    - ⌘Enter를 누르면 터미널에 들어가고, 제출하면 전체 내용이 전달된다.
    - Esc를 누르면 아무것도 들어가지 않고 터미널로 포커스가 돌아온다.
    - 작성 중에 `⌃⌥4`를 누르면 확인 문구가 뜬다.
- [ ] **Step 5: 체크포인트** — `feat: fill window`

### Task 14: 검색 팝업

**Files:**
- Create: `src/core/paletteState.ts`, `src/overlay/PaletteView.tsx`
- Modify: `src/overlay/OverlayApp.tsx`, `src/controller/controller.ts`
- Test: `src/core/paletteState.test.ts`

**Interfaces:**
- Consumes: `search`, `flatten`, `pushRecent` (Task 6), `KeyInput` (Task 13), `planAction`/`planPhrase` (Task 10)
- Produces:
  ```ts
  export interface PaletteState { query: string; active: number }
  export type PaletteEffect = { type: 'none' } | { type: 'choose'; index: number } | { type: 'close' };
  export function paletteKey(s: PaletteState, input: KeyInput, count: number): { state: PaletteState; effect: PaletteEffect };
  export function setQuery(s: PaletteState, query: string): PaletteState; // active → 0
  ```
- **키 규칙**
  - `isComposing`이면 아무것도 하지 않는다(Review Focus 1).
  - ArrowDown/ArrowUp은 순환한다.
  - Enter: `count > 0`이면 `choose(active)`를 낸다.
  - Esc: `close`를 낸다.
- **UI** (시안 A)
  - 위쪽에 검색 입력과 현재 모드 표시를 둔다.
  - 그룹 제목을 보여주고, 추천 항목에 "추천" 배지를 붙인다. 템플릿 항목 오른쪽에는 단축키를 표시한다.
  - 아래 안내: `<팝업 단축키>로 열기 · ↑↓ 이동 · Enter 넣기 · Esc 닫기`
  - 열 때마다 검색어를 비우고 입력란에 포커스를 둔다. 창이 blur되면 숨긴다(검색 팝업만 해당).
- **선택했을 때**
  - 문구: `hideOverlay` → `pasteText` → recent 갱신·저장
  - 템플릿: `planAction`으로 처리한다. 채우기 모드면 같은 창이 fill 보기로 바뀐다.
  - 고른 항목은 모두 recent에 넣는다.
- 컨트롤러: palette 계획이 오면 `overlayStore`를 palette 보기로 바꾸고 `showOverlay('palette')`를 호출한다.

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```ts
  const ki = (key: string, isComposing = false): KeyInput => ({ key, metaKey: false, ctrlKey: false, shiftKey: false, isComposing });
  expect(paletteKey({ query: '', active: 2 }, ki('ArrowDown'), 3).state.active).toBe(0);
  expect(paletteKey({ query: '', active: 0 }, ki('ArrowUp'), 3).state.active).toBe(2);
  expect(paletteKey({ query: '계', active: 1 }, ki('Enter', true), 3).effect).toEqual({ type: 'none' });
  expect(paletteKey({ query: '계획', active: 1 }, ki('Enter'), 3).effect).toEqual({ type: 'choose', index: 1 });
  expect(paletteKey({ query: 'zz', active: 0 }, ki('Enter'), 0).effect).toEqual({ type: 'none' });
  expect(paletteKey({ query: '', active: 0 }, ki('Escape'), 3).effect).toEqual({ type: 'close' });
  expect(setQuery({ query: 'a', active: 4 }, 'ab')).toEqual({ query: 'ab', active: 0 });
  ```
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- paletteState`
  - Expected: FAIL
- [ ] **Step 3: 구현** — 위 동작대로 구현한다.
- [ ] **Step 4: 검증**
  - Run: `npm test && npm run typecheck && npm run lint`
  - Expected: PASS
  - 수동 점검:
    - TextEdit에서 `⌃⌥P` → "계획" 입력(한글 조합 중 Enter로 선택되지 않음) → 문구 선택 → TextEdit에 들어간다.
    - 다시 열면 그 문구가 "최근"에 보인다.
    - "버그"를 검색하고 템플릿을 고르면 채우기 창으로 바뀐다.
    - 바깥을 클릭하면 팝업이 닫힌다.
- [ ] **Step 5: 체크포인트** — `feat: search palette`

### Task 15: 편집 창 — 템플릿 탭, 가이드 패널, 단축키 녹화

**Files:**
- Create: `src/core/editing.ts`, `src/editor/EditorApp.tsx`, `src/editor/TemplatesTab.tsx`, `src/editor/GuidePanel.tsx`, `src/editor/HotkeyRecorder.tsx`
- Modify: `src-tauri/src/app_windows.rs` (`open_editor`에 탭 이벤트 추가), `src-tauri/src/lib.rs` (single-instance → open_editor), `src/main-editor.tsx`, `src/controller/controller.ts`
- Test: `src/core/editing.test.ts`

**Interfaces:**
- Consumes: `guideKeyAt`, `guideFor` (Task 7), `findConflicts`, `acceleratorFromKeyEvent`, `formatAccelerator` (Task 4), `resetTemplate` (Task 5), `HighlightedTextarea` (Task 13), `saveAppData` (Task 8)
- Produces (Rust): `open_editor(tab)`(Task 12에서 만듦)가 창을 띄운 뒤 `editor-tab` 이벤트를 보내게 한다. 편집 창이 막 만들어진 경우에는 첫 렌더링 뒤에 탭이 적용되도록 URL 해시(`editor.html#settings`)로도 넘긴다.
- Produces (`editing.ts`, 모두 새 `AppData`를 돌려줌):
  ```ts
  export function setTemplateName(d: AppData, id: string, name: string): AppData;
  export function setTemplateBody(d: AppData, id: string, mode: Mode, text: string): AppData;
  export function setTemplateHidden(d: AppData, id: string, hidden: boolean): AppData;
  export function createTemplate(d: AppData, newId: string): AppData;                    // name '새 템플릿', bodies all '', builtIn false, last order
  export function duplicateTemplate(d: AppData, id: string, newId: string): AppData;     // name '<원래 이름> 복사본', builtIn false, inserted right after
  export function deleteTemplate(d: AppData, id: string): AppData;                       // built-in → unchanged; also clears its binding
  export function moveTemplate(d: AppData, id: string, toIndex: number): AppData;        // renumbers order 0..n-1
  export function copyBodyToModes(d: AppData, id: string, from: Mode, to: Mode[]): AppData;
  export function setBinding(d: AppData, action: ActionId, acc: string | null): AppData;
  export function newId(prefix: 't' | 'p'): string;                                      // `${prefix}-${crypto.randomUUID()}`
  ```
- **UI** (시안 `mockups/editor.html`)
  - 위쪽 탭은 템플릿 / 문구 / 단축키·설정이다. 이 작업에서는 템플릿 탭만 채운다.
  - **왼쪽 목록**: 기본 템플릿과 내 템플릿으로 나누고, 각 항목에 단축키를 표시한다. 아래에 "+ 새 템플릿 · 기본 템플릿 복제"를 둔다. 순서 바꾸기는 위·아래 버튼으로 한다(빌더 판단).
  - **가운데**
    - 모드 선택 버튼과 이름 편집이 있다.
    - 본문은 `HighlightedTextarea`로 편집한다. 제목, 빈칸, 마지막 문장을 색으로 구분한다.
    - 아래 줄에 `HotkeyRecorder`, "기본값으로"(기본 템플릿만), "다른 모드에 복사", 숨기기/삭제를 둔다.
  - **HotkeyRecorder**
    - 클릭하면 녹화를 시작한다.
    - 녹화 결과가 `internal` 충돌이면 저장하지 않고 경고를 띄운다.
    - `system`/`common` 충돌이면 경고를 띄우고 저장은 허용한다.
    - `registration-result`로 받은 실패도 경고로 보여준다.
    - 시스템 단축키 목록은 창을 열 때 `readSystemShortcuts()`로 한 번 읽는다.
  - **GuidePanel**
    - 커서가 움직일 때 `guideKeyAt`으로 항목을 찾는다.
    - 왜 필요해요, ✓ 좋은 예, ✗ 나쁜 예, 팁, 출처를 보여준다.
    - 출처를 누르면 `@tauri-apps/plugin-opener`의 `openUrl`로 연다.
- **저장과 동기화**
  - 편집 후 400ms 디바운스로 `saveAppData(data, 'editor')`를 호출한다.
  - 컨트롤러는 `editor` 출처의 data-changed를 받으면 다음을 한다:
    1. 다시 불러온다.
    2. `setShortcuts`
    3. `registration-result`를 보낸다.
    4. `syncTray`
  - 편집 창은 `controller` 출처의 data-changed를 받으면 `settings.recent`만 갱신한다. 편집 중인 내용을 덮어쓰지 않으려는 것이다.

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```ts
  const d = mergeWithDefaults(null);
  const dup = duplicateTemplate(d, 'feature', 't-1');
  expect(dup.templates[2]).toMatchObject({ id: 't-1', name: '기능 개발 복사본', builtIn: false });
  expect(dup.templates[2].bodies).toEqual(d.templates[1].bodies);
  expect(deleteTemplate(d, 'feature')).toBe(d);
  const withB = setBinding(createTemplate(d, 't-2'), 'template:t-2', 'Control+Alt+Digit6');
  expect(deleteTemplate(withB, 't-2').settings.bindings['template:t-2']).toBeUndefined();
  expect(moveTemplate(d, 'research', 0).templates.map(t => [t.id, t.order])[0]).toEqual(['research', 0]);
  const c = copyBodyToModes(setTemplateBody(d, 'test', 'claude', 'X'), 'test', 'claude', ['codex', 'gemini']);
  expect(c.templates[2].bodies).toEqual({ claude: 'X', codex: 'X', gemini: 'X' });
  expect(toStored(setTemplateHidden(d, 'test', true)).templateOverrides.test).toEqual({ hidden: true });
  expect(createTemplate(d, 't-3').templates.at(-1)).toMatchObject({ name: '새 템플릿', bodies: { claude: '', codex: '', gemini: '' } });
  ```
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- editing`
  - Expected: FAIL
- [ ] **Step 3: 구현** — 위 동작대로 구현한다.
- [ ] **Step 4: 검증**
  - Run: `npm test && npm run typecheck && npm run lint && (cd src-tauri && cargo clippy -- -D warnings)`
  - Expected: PASS
  - 수동 점검:
    - 기능 개발 Claude Code 본문을 고치면, `⌃⌥2` 채우기 창에 고친 내용이 나온다.
    - "기본값으로"를 누르면 원래대로 돌아온다.
    - 템플릿을 숨기면 메뉴와 팝업에서 사라진다.
    - 단축키를 `⌃⌥Space`로 녹화하면 "시스템 단축키(입력 소스 전환)와 겹쳐요" 경고가 뜬다.
    - 가이드 패널이 커서를 따라 바뀌고, 출처를 누르면 브라우저가 열린다.
    - **편집 입력란에서 ⌘C/⌘V/⌘Z/⌘A가 동작한다**(Review Focus 2).
    - 앱을 두 번 실행하면 편집 창이 열린다.
- [ ] **Step 5: 체크포인트** — `feat: editor templates tab and guide panel`

### Task 16: 편집 창 — 문구 탭, 단축키·설정 탭, 처음 실행 안내

**Files:**
- Create: `src/editor/PhrasesTab.tsx`, `src/editor/SettingsTab.tsx`
- Modify: `src/core/editing.ts`, `src/editor/EditorApp.tsx`, `src/controller/controller.ts`
- Test: `src/core/editing.test.ts` (문구 함수 추가)

**Interfaces:**
- Produces (`editing.ts` 추가):
  ```ts
  export function addPhrase(d: AppData, newId: string, category: PhraseCategory): AppData;   // text '', recommendedModes 'all', last order in category
  export function updatePhrase(d: AppData, id: string, patch: Partial<Pick<Phrase, 'text' | 'category' | 'recommendedModes'>>): AppData;
  export function deletePhrase(d: AppData, id: string): AppData;                               // also removes from settings.recent
  export function movePhrase(d: AppData, id: string, toIndex: number): AppData;
  export function setInsertMode(d: AppData, m: InsertMode): AppData;
  export function setLaunchAtLogin(d: AppData, on: boolean): AppData;
  ```
- **문구 탭**
  - 분류별 목록을 보여준다.
  - 문구마다 본문 편집, 분류 선택, 추천 모드 선택(전체 / 모드 체크박스), 삭제, 순서 바꾸기가 있다.
- **단축키·설정 탭**
  - 템플릿(숨기지 않은 것), 검색 팝업, 모드 전환의 `HotkeyRecorder` 목록
  - "템플릿 넣는 방식"을 라디오로 고른다: 채우기 창(기본) / 바로 붙여넣기
  - "로그인 시 자동 실행" 토글: `@tauri-apps/plugin-autostart`의 `enable`/`disable`과 설정값을 함께 바꾼다.
  - (맥) 손쉬운 사용 권한 상태와 "시스템 설정 열기", "다시 확인" 버튼
- **처음 실행**
  - `loadData()`가 `null`이었으면 자동 실행을 켠다(기본값 true).
  - 맥이고 권한이 없으면 `openEditor('settings')`를 호출한다. 설정 탭 위쪽에 안내 배너를 띄운다:
    > "단축키로 붙여넣으려면 '손쉬운 사용' 권한이 필요해요. 권한이 없어도 템플릿은 클립보드에 복사돼요."

- [ ] **Step 1: 실패하는 테스트 쓰기**
  ```ts
  const d = mergeWithDefaults(null);
  const a = addPhrase(d, 'p-x', '범위');
  expect(a.phrases.find(p => p.id === 'p-x')).toMatchObject({ text: '', category: '범위', recommendedModes: 'all' });
  expect(toStored(updatePhrase(d, 'p01', { text: '계획부터' })).phrases).not.toBeNull();
  const r = { ...d, settings: { ...d.settings, recent: [{ kind: 'phrase' as const, id: 'p02' }] } };
  expect(deletePhrase(r, 'p02').settings.recent).toEqual([]);
  expect(setInsertMode(d, 'direct').settings.insertMode).toBe('direct');
  expect(toStored(updatePhrase(updatePhrase(d, 'p01', { text: 'x' }), 'p01', { text: d.phrases[0].text })).phrases).toBeNull();
  ```
- [ ] **Step 2: 실패 확인**
  - Run: `npm test -- editing`
  - Expected: FAIL (새 함수 없음)
- [ ] **Step 3: 구현** — 위 동작대로 구현한다.
- [ ] **Step 4: 검증**
  - Run: `npm test && npm run typecheck && npm run lint`
  - Expected: PASS
  - 수동 점검:
    - 문구를 추가하면 팝업과 메뉴에 바로 나온다.
    - "바로 붙여넣기"로 바꾸면 `⌃⌥2`가 채우기 창 없이 들어간다.
    - 자동 실행을 끄고 켜면 시스템 설정의 로그인 항목에 반영된다.
    - 단축키를 바꾸고 앱을 다시 켜도 유지된다.
    - `data.json`을 지운 뒤 실행하면 기본값으로 시작하고, 권한이 없으면 설정 탭이 열린다.
    - `data.json`을 일부러 깨뜨리면 `data.corrupt-*.json`이 생기고 기본값으로 시작한다.
- [ ] **Step 5: 체크포인트** — `feat: editor phrases and settings tabs`

### Task 17: 윈도우 컴파일 확인, README, 최종 점검

**Files:**
- Create: `README.md`
- Modify: 점검에서 발견된 문제가 있는 파일

- [ ] **Step 1: 윈도우 컴파일 확인 (선택)**
  - `rustup target add x86_64-pc-windows-msvc` 설치를 사용자에게 묻는다.
  - 승인되면 `(cd src-tauri && cargo check --target x86_64-pc-windows-msvc)`를 실행한다.
  - 크로스 컴파일 도구 문제(C 헤더·SDK 등)로 실패하면, 원인을 기록하고 "윈도우 컴파일 확인 못 함"으로 보고한다.
- [ ] **Step 2: README 쓰기** (한국어)
  - 실행 방법: `npm install`, `npm run tauri dev`, `npm run tauri build`
  - 맥 손쉬운 사용 권한 안내
  - 데이터 파일 위치(`data.json`)와 깨졌을 때의 동작
  - 기본 단축키 표
  - **윈도우: 실행 검증 안 됨**
  - 알려진 한계
    - 텍스트와 이미지 외의 클립보드 형식은 복원하지 않는다.
    - 다른 앱 내부의 단축키 충돌은 감지할 수 없다.
    - 관리자 권한으로 실행된 윈도우 앱에는 붙여넣지 못한다.
- [ ] **Step 3: 전체 자동 검증**
  - Run: `npm run typecheck && npm run lint && npm test && (cd src-tauri && cargo clippy -- -D warnings && cargo test)`
  - Expected: 모두 통과한다.
- [ ] **Step 4: 설계 문서 9절 수동 점검표 전체 실행 (맥, 사용자 참여)**
  - 항목마다 통과·실패를 기록한다.
  - 실패한 항목은 고치고 다시 점검한다.
  - 확인하지 못한 항목은 그렇다고 적는다.
- [ ] **Step 5: 체크포인트** — `docs: readme and verification`
