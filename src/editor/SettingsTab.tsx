import { useEffect, useState } from "react";
import { disable, enable } from "@tauri-apps/plugin-autostart";
import { checkAccessibility, openAccessibilitySettings, type RegistrationFailure } from "../bridge/commands";
import { setBinding, setInsertMode, setLaunchAtLogin } from "../core/editing";
import type { ActionId, AppData, Platform } from "../core/types";
import { HotkeyRecorder } from "./HotkeyRecorder";

interface Props {
  data: AppData;
  platform: Platform;
  systemShortcuts: readonly string[];
  failures: RegistrationFailure[];
  onChange: (next: AppData) => void;
}

export function SettingsTab({ data, platform, systemShortcuts, failures, onChange }: Props) {
  const [accessibilityOk, setAccessibilityOk] = useState<boolean | null>(null);
  const [autostartError, setAutostartError] = useState<string | null>(null);

  useEffect(() => {
    checkAccessibility().then(setAccessibilityOk, () => setAccessibilityOk(null));
  }, []);

  const recheck = () => checkAccessibility().then(setAccessibilityOk, () => setAccessibilityOk(null));

  const rows: Array<[ActionId, string]> = [
    ...data.templates.filter((t) => !t.hidden).map((t): [ActionId, string] => [`template:${t.id}`, t.name]),
    ["palette", "검색 팝업"],
    ["cycleMode", "모드 전환"],
  ];

  const toggleAutostart = async (on: boolean) => {
    try {
      await (on ? enable() : disable());
      setAutostartError(null);
      onChange(setLaunchAtLogin(data, on));
    } catch (e) {
      setAutostartError(String(e));
    }
  };

  return (
    <div className="settings">
      {platform === "mac" && accessibilityOk === false && (
        <div className="banner">
          <p>단축키로 붙여넣으려면 '손쉬운 사용' 권한이 필요해요. 권한이 없어도 템플릿은 클립보드에 복사돼요.</p>
          <button type="button" className="btn" onClick={() => void openAccessibilitySettings()}>
            시스템 설정 열기
          </button>
          <button type="button" className="btn" onClick={() => void recheck()}>
            다시 확인
          </button>
        </div>
      )}

      <section>
        <h3>단축키</h3>
        <p className="note">버튼을 누르고 원하는 키 조합을 누르세요. ⌃, ⌥, ⌘ 중 하나는 꼭 함께 눌러야 해요.</p>
        <table className="keys">
          <tbody>
            {rows.map(([action, label]) => (
              <tr key={action}>
                <td>{label}</td>
                <td>
                  <HotkeyRecorder
                    action={action}
                    data={data}
                    platform={platform}
                    systemShortcuts={systemShortcuts}
                    failures={failures}
                    onChange={(acc) => onChange(setBinding(data, action, acc))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>템플릿 넣는 방식</h3>
        <label className="radio">
          <input
            type="radio"
            name="insert"
            checked={data.settings.insertMode === "fill"}
            onChange={() => onChange(setInsertMode(data, "fill"))}
          />
          채우기 창 (기본) — 빈칸을 채운 뒤 붙여넣어요. 긴 글을 접어 보여주는 터미널에서도 편해요.
        </label>
        <label className="radio">
          <input
            type="radio"
            name="insert"
            checked={data.settings.insertMode === "direct"}
            onChange={() => onChange(setInsertMode(data, "direct"))}
          />
          바로 붙여넣기 — 템플릿을 그대로 넣고 빈칸은 붙여넣은 곳에서 채워요.
        </label>
      </section>

      <section>
        <h3>시작</h3>
        <label className="check">
          <input
            type="checkbox"
            checked={data.settings.launchAtLogin}
            onChange={(e) => void toggleAutostart(e.target.checked)}
          />
          로그인할 때 자동으로 실행
        </label>
        {autostartError && <p className="warn">⚠ 자동 실행 설정을 바꾸지 못했어요: {autostartError}</p>}
      </section>

      {platform === "mac" && (
        <section>
          <h3>손쉬운 사용 권한</h3>
          <p className="note">
            {accessibilityOk === null ? "확인 중…" : accessibilityOk ? "허용됨" : "꺼져 있어요"}
            {" · "}
            <button type="button" className="link" onClick={() => void openAccessibilitySettings()}>
              시스템 설정 열기
            </button>
            {" · "}
            <button type="button" className="link" onClick={() => void recheck()}>
              다시 확인
            </button>
          </p>
        </section>
      )}
    </div>
  );
}
