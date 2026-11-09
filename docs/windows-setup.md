# 윈도우에서 Prompt Helper 설치하고 실행하기

> 윈도우용 코드는 들어 있지만, 아직 한 번도 컴파일하거나 실행해 보지 못했어요. 빌드 오류나 동작 문제가 나올 수 있어요. 오류가 나면 터미널 메시지를 그대로 복사해서 Claude에게 보내 주세요.

## 1. 맥에서: 코드를 zip으로 묶기

커밋된 파일만 묶여요. `node_modules`와 빌드 결과물은 빠져요.

```bash
git -C ~/dev/prompt-helper archive -o ~/Desktop/prompt-helper.zip HEAD
```

바탕화면에 생긴 `prompt-helper.zip`을 USB나 클라우드(구글 드라이브 등)로 윈도우 PC에 옮겨요.

## 2. 윈도우에서: 필요한 프로그램 설치 (처음 한 번만)

PowerShell을 열고 아래를 실행해요. 관리자 권한으로 열 필요는 없어요. 설치 중에 권한을 묻는 창이 뜨면 허용해 주세요.

```powershell
# C++ 빌드 도구 (Rust가 윈도우용으로 빌드할 때 필요)
winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"

# Rust
winget install --id Rustlang.Rustup

# Node.js (LTS)
winget install --id OpenJS.NodeJS.LTS
```

설치가 끝나면 **PowerShell을 닫았다가 새로 열고** 아래로 확인해요.

```powershell
rustup default stable-msvc
rustc --version
cargo --version
node --version
npm --version
```

모두 버전이 나오면 준비가 끝난 거예요.

- WebView2는 윈도우 10과 11에 이미 들어 있어요.
- `winget`이 없거나 실패하면 직접 받아서 설치해도 돼요.
  - C++ 빌드 도구: https://visualstudio.microsoft.com/visual-cpp-build-tools/ 에서 받은 뒤 설치 화면에서 "C++를 사용한 데스크톱 개발"을 체크해요.
  - Rust: https://rustup.rs 에서 `rustup-init.exe`를 받아 기본값으로 설치해요.
  - Node.js: https://nodejs.org 에서 LTS 버전을 받아요.

## 3. 압축 풀고 실행하기

zip을 `다운로드` 폴더에 두었다고 가정한 명령이에요. 다른 곳에 두었다면 경로만 바꿔 주세요.

```powershell
Expand-Archive -Path "$HOME\Downloads\prompt-helper.zip" -DestinationPath "$HOME\dev\prompt-helper"
cd "$HOME\dev\prompt-helper"
npm install
npm run tauri dev
```

- 처음 빌드는 몇 분에서 10분 정도 걸려요. 두 번째부터는 빨라요.
- 개발 실행(`tauri dev`)은 오류가 터미널에 바로 보여서 첫 테스트에 좋아요.
- 앱이 뜨면 작업 표시줄 오른쪽 트레이에 아이콘이 생겨요. 안 보이면 `^`(숨겨진 아이콘) 안을 확인해 주세요.
- 끝내려면 트레이 메뉴의 "종료"를 누르거나, 터미널에서 `Ctrl+C`를 눌러요.

## 4. 설치 파일 만들기 (선택)

```powershell
cd "$HOME\dev\prompt-helper"
npm run tauri build
```

결과는 이 폴더들에 생겨요.

- `src-tauri\target\release\bundle\nsis\` 의 `..._x64-setup.exe` (설치 프로그램)
- `src-tauri\target\release\bundle\msi\` 의 `.msi`

서명하지 않은 설치 파일이라 실행하면 SmartScreen 경고가 떠요. "추가 정보 → 실행"을 누르면 돼요.

설치 파일로 설치한 앱은 첫 실행 때 "로그인할 때 자동으로 실행"이 켜져요. 원하지 않으면 트레이 메뉴의 "설정…"에서 꺼 주세요. 개발 실행(`tauri dev`)에서는 켜지지 않아요.

## 5. 윈도우에서 확인할 것

메모장을 열어 두고 하나씩 해 보세요.

1. 트레이 아이콘을 클릭하면 메뉴가 열리고, 모드(Codex 등)를 바꾸면 체크 표시가 옮겨 가요.
2. 메모장에서 `Ctrl+Alt+2`를 누르면 채우기 창이 뜨고 첫 빈칸이 선택돼요.
3. 한글로 입력하고 `Tab`을 누르면 다음 빈칸으로 넘어가요.
4. `Ctrl+Enter`를 누르면(빈칸이 남았으면 두 번) 메모장에 붙여넣어져요.
5. 미리 복사해 둔 글이, 붙여넣은 뒤에도 클립보드에 그대로 남아 있어요(`Ctrl+V`로 확인).
6. `Esc`를 누르면 붙여넣지 않고 메모장으로 돌아가요. 다시 `Ctrl+Alt+2`를 누르면 쓰던 내용이 이어서 나와요.
7. `Ctrl+Alt+P`를 누르면 검색 팝업이 뜨고, 문구를 고르면 메모장에 들어가요.
8. `Ctrl+Alt+M`을 누르면 오른쪽 위에 모드 알림이 뜨고, 메모장에 계속 입력할 수 있어요.
9. 트레이 메뉴의 "템플릿 편집…"과 "설정…"을 누르면 편집 창이 열리고, 닫기 버튼으로 닫혀요.
10. 편집 창에서 단축키를 다른 조합으로 녹화하면 새 조합이 동작해요.

한국어 키보드에서는 오른쪽 Alt가 한/영 키라서, 단축키는 **왼쪽 Ctrl+Alt**로 눌러 주세요.

## 6. 문제가 생기면

| 증상 | 해결 |
|---|---|
| `link.exe`를 찾을 수 없다는 오류 | C++ 빌드 도구가 없거나 "C++를 사용한 데스크톱 개발"이 빠졌어요. "필요한 프로그램 설치"를 다시 해 주세요. |
| `rc.exe`나 Windows SDK 관련 오류 | Visual Studio Installer → Build Tools 수정 → Windows SDK를 추가해 주세요. |
| `npm`, `cargo`를 찾을 수 없다는 오류 | 설치 후 PowerShell을 새로 열지 않았어요. 창을 닫고 다시 열어 주세요. |
| `npm.ps1 ... running scripts is disabled` 오류 | PowerShell 대신 "명령 프롬프트(cmd)"에서 같은 명령을 실행해 주세요. |
| 단축키를 눌러도 반응이 없어요 | 다른 프로그램이 같은 조합을 쓰고 있을 수 있어요. 설정에서 다른 조합으로 바꿔 보세요. |
| 관리자 권한으로 실행한 앱에 붙여넣기가 안 돼요 | 윈도우 제한이에요. 그 앱을 일반 권한으로 실행해 주세요. |

그 밖의 오류는 터미널 메시지 전체를 복사해서 보내 주세요.

설정과 수정한 템플릿은 `%APPDATA%\dev.prompthelper.app\data.json`에 저장돼요. 처음 상태로 돌리고 싶으면 앱을 종료한 뒤 이 파일을 지우면 돼요.
