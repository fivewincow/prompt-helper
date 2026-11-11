# Prompt Helper

AI 코딩 에이전트(Claude Code, Codex, Gemini)에 보낼 프롬프트를 단축키로 꺼내 쓰는 메뉴바 앱이에요. 템플릿을 불러와 빈칸을 채우고, 원래 쓰던 앱의 커서 위치에 붙여넣어요.

- 설계: [docs/superpowers/specs/2026-11-09-prompt-helper-design.md](docs/superpowers/specs/2026-11-09-prompt-helper-design.md)
- 기본 콘텐츠(템플릿, 문구, 가이드): [docs/superpowers/specs/2026-11-09-prompt-helper-default-content.md](docs/superpowers/specs/2026-11-09-prompt-helper-default-content.md)
- 조사 근거: [docs/research/2026-11-09-ai-prompting-research.md](docs/research/2026-11-09-ai-prompting-research.md)

## 실행

필요한 것: Node.js 20 이상, Rust(stable), Xcode Command Line Tools(맥), Visual Studio Build Tools의 C++ 도구(윈도우)

윈도우에서 처음 설치한다면 아래 [윈도우에서 설치](#윈도우에서-설치)를 먼저 보세요.

```bash
npm install
```

```bash
npm run tauri dev
```

배포용 빌드:

```bash
npm run tauri build
```

검사:

```bash
npm run typecheck && npm run lint && npm test
```

```bash
cd src-tauri && cargo clippy -- -D warnings && cargo test
```

## 윈도우에서 설치

설치 파일(릴리스)은 아직 없어서 소스를 받아 직접 빌드해야 해요. PowerShell 기준이에요.

### 1. 필요한 프로그램

| 프로그램 | 설치 명령 | 없을 때 나오는 오류 |
|---|---|---|
| Node.js 20 이상 | `winget install OpenJS.NodeJS.LTS` | `'npm'은(는) 내부 또는 외부 명령…이 아닙니다` |
| Rust(stable) | `winget install Rustlang.Rustup` | `failed to run 'cargo metadata' … program not found` |
| Visual Studio Build Tools (C++ 도구) | 아래 명령 | `error: linker 'link.exe' not found` |

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

- Build Tools는 몇 GB라서 시간이 걸려요. Visual Studio에 "C++를 사용한 데스크톱 개발"이 이미 있으면 건너뛰어도 돼요. VS Code는 다른 제품이라 대신할 수 없어요.
- Build Tools를 깔았는데도 `link.exe` 오류가 나면, Visual Studio Installer → Build Tools 2022 → 수정에서 "C++를 사용한 데스크톱 개발"에 체크하고 다시 설치해요.
- `winget`이 안 되면 Rust는 <https://rustup.rs>, Node.js는 <https://nodejs.org>에서 설치 파일을 받아요.
- 설치한 뒤에는 **PowerShell 창을 닫고 새로 열어야** `cargo` 같은 명령의 경로가 잡혀요. `cargo --version`에 버전이 나오면 된 거예요.
- 윈도우 10이라면 WebView2 런타임도 필요해요. 윈도우 11에는 기본으로 들어 있어요.

### 2. 받아서 실행

```powershell
git clone https://github.com/fivewincow/prompt-helper
cd prompt-helper
npm.cmd install
npm.cmd run tauri dev
```

첫 실행은 Rust 패키지를 모두 컴파일하느라 몇 분 걸려요. 설치 파일을 만들려면 `npm.cmd run tauri build`를 써요.

### 3. 자주 나오는 오류

| 오류 | 원인과 해결 |
|---|---|
| `이 시스템에서 스크립트를 실행할 수 없으므로 …\npm.ps1 파일을 로드할 수 없습니다` | PowerShell 실행 정책이 `npm.ps1`을 막은 거예요. `npm` 대신 `npm.cmd`를 쓰거나, `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`로 내 계정의 정책을 풀어요. |
| `'tauri'은(는) 내부 또는 외부 명령…이 아닙니다` | `npm.cmd install`을 아직 안 했거나 실패한 거예요. 먼저 설치를 끝내요. |
| `failed to run 'cargo metadata' … program not found` | Rust가 없거나, 설치한 뒤 PowerShell을 새로 열지 않은 거예요. |
| `error: linker 'link.exe' not found` | Visual Studio Build Tools의 C++ 도구가 없는 거예요. 위 1번의 명령으로 설치해요. |

## 맥: 손쉬운 사용 권한

단축키를 누르면 앱이 대신 ⌘V를 눌러 붙여넣어요. 다른 앱에 키 입력을 보내려면 **시스템 설정 → 개인정보 보호 및 보안 → 손쉬운 사용**에서 Prompt Helper를 허용해야 해요. 개발 중(`npm run tauri dev`)에는 `prompt-helper` 개발 빌드가 목록에 나와요.

- 권한이 없을 때: 붙여넣지 않고 클립보드에만 복사한 뒤 "⌘V로 붙여넣으세요" 알림을 띄워요.
- 처음 실행했는데 권한이 없으면 편집 창의 설정 탭이 열리고 안내가 보여요.

## 기본 단축키

| 기능 | 맥 | 윈도우 |
|---|---|---|
| 기획 문서 | ⌃⌥1 | Ctrl+Alt+1 |
| 기능 개발 | ⌃⌥2 | Ctrl+Alt+2 |
| 테스트 | ⌃⌥3 | Ctrl+Alt+3 |
| 버그 수정 | ⌃⌥4 | Ctrl+Alt+4 |
| 긴 작업 · 자료 조사 | ⌃⌥5 | Ctrl+Alt+5 |
| 검색 팝업 | ⌃⌥P | Ctrl+Alt+P |
| 모드 전환 | ⌃⌥M | Ctrl+Alt+M |

메뉴바의 "설정…"이나 편집 창의 "단축키 · 설정" 탭에서 모두 바꿀 수 있어요.

## 채우기 창

| 키 | 동작 |
|---|---|
| Tab / Shift+Tab | 다음 / 이전 빈칸 |
| Enter | 줄바꿈 |
| ⌘Enter (윈도우 Ctrl+Enter) | 붙여넣기. 빈칸이 남았으면 한 번 알려줘요 |
| ⌘K (윈도우 Ctrl+K) | 문구 검색 |
| ⌘R (윈도우 Ctrl+R) | 템플릿 원문으로 되돌리기. 쓴 내용이 있으면 먼저 물어봐요 |
| Esc | 닫기. 쓴 내용은 임시저장돼요 |

쓰다가 닫거나 다른 템플릿으로 바꾸면, 쓴 내용은 템플릿마다 임시저장돼요. 같은 템플릿을 다시 열면 이어서 쓸 수 있어요. 붙여넣기에 성공하면 그 임시저장은 지워지고, 앱을 종료하면 모두 사라져요.

설정에서 "바로 붙여넣기"를 고르면 채우기 창 없이 템플릿을 그대로 붙여넣어요.

## 템플릿 공유

편집 창의 "단축키 · 설정" 탭 → "공유"에서 템플릿과 문구를 JSON 파일(`prompt-helper-templates-날짜.json`)로 내보내고 가져와요.

- 파일에는 이름과 모드별 본문(템플릿), 갈래·문장·추천 모드(문구)만 들어가요. 단축키, 순서, 숨김 같은 개인 설정은 넣지 않아요.
- 가져오기는 추가만 해요. 이름이 겹치는 템플릿은 "이름 (2)"로 추가하고, 이미 있는 문구는 건너뛰어요.
- 형식: `{"format": "prompt-helper-templates", "version": 1, "exportedAt": "…", "templates": [{"name", "bodies": {"claude", "codex", "gemini"}}], "phrases": [{"category", "text", "recommendedModes"}]}`

## 데이터 파일

설정과 수정한 템플릿·문구는 앱 데이터 폴더의 `data.json` 하나에 저장돼요. 기본값과 다른 부분만 저장하므로, 앱이 업데이트되어 기본 템플릿이 바뀌어도 사용자가 고친 내용은 그대로예요.

- 맥: `~/Library/Application Support/dev.prompthelper.app/data.json`
- 윈도우: `%APPDATA%\dev.prompthelper.app\data.json`

파일이 깨져서 읽을 수 없으면 `data.corrupt-<시각>.json`으로 옮겨 두고 기본값으로 시작해요.

## 윈도우

**윈도우 코드는 들어 있지만 실행 검증은 하지 않았어요.** 맥에서 `cargo check --target x86_64-pc-windows-msvc`를 시도했지만, Tauri 빌드 스크립트가 윈도우 리소스 컴파일러(`llvm-rc`)를 찾지 못해 우리 코드에 닿기 전에 멈췄어요. 그래서 컴파일 확인도 하지 못했어요. 윈도우 PC나 `llvm`이 설치된 환경에서 확인이 필요해요.

## 알려진 한계

- 붙여넣는 동안 클립보드를 잠깐 빌려 써요. 텍스트와 이미지는 되돌려 놓지만, 파일이나 서식 있는 텍스트 같은 다른 형식은 되돌리지 못해요.
- 다른 앱 안에서만 쓰는 단축키(예: Slack 안의 단축키)와 겹치는지는 알 수 없어요. 맥 시스템 단축키, 앱 안에서의 중복, 흔한 단축키 목록만 확인해요.
- 윈도우에서는 관리자 권한으로 실행된 앱에 붙여넣지 못해요.
- 터미널의 Claude Code는 긴 붙여넣기를 `[Pasted text #1 +N lines]`로 접어 보여줘요. 그래서 빈칸은 채우기 창에서 채운 뒤 붙여넣는 것을 기본으로 했어요.
