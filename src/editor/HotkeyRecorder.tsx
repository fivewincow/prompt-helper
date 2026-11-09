import { useEffect, useState } from "react";
import type { RegistrationFailure } from "../bridge/commands";
import { emitRecording } from "../bridge/events";
import { actionLabel } from "../core/editing";
import { findConflicts, formatAccelerator, recordKey, type Conflict } from "../core/hotkeys";
import type { ActionId, AppData, Platform } from "../core/types";

interface Props {
  action: ActionId;
  data: AppData;
  platform: Platform;
  systemShortcuts: readonly string[];
  failures: RegistrationFailure[];
  onChange: (accelerator: string | null) => void;
}

function conflictMessage(c: Conflict, data: AppData, platform: Platform): string {
  switch (c.kind) {
    case "internal":
      return `이미 '${actionLabel(c.detail, data)}'에 쓰는 키예요`;
    case "system":
      return `시스템 단축키(${formatAccelerator(c.detail, platform)})와 겹쳐요`;
    case "common":
      return `자주 쓰는 단축키(${formatAccelerator(c.detail, platform)})와 겹쳐요`;
    case "registration":
      return c.detail;
  }
}

/** Click, then press a key combination. Esc cancels, Backspace clears the hotkey. */
export function HotkeyRecorder({ action, data, platform, systemShortcuts, failures, onChange }: Props) {
  const [recording, setRecording] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  const value = data.settings.bindings[action] ?? null;

  // While recording, the controller has paused every global hotkey. Listen on the window,
  // not the button: WebKit does not focus a button on click, so its own keydown never fires.
  // The cleanup always ends recording, so hotkeys come back even if this view goes away.
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const r = recordKey(e, action, data.settings.bindings, platform);
      if (r.type === "wait") return;
      if (r.type === "clear") onChange(null);
      if (r.type === "set") onChange(r.accelerator);
      setRejected(r.type === "reject" ? conflictMessage(r.conflict, data, platform) : null);
      setRecording(false);
    };
    const stop = () => setRecording(false);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("blur", stop);
    void emitRecording(true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("blur", stop);
      void emitRecording(false);
    };
  }, [recording, action, data, platform, onChange]);

  const warnings = value
    ? findConflicts(value, action, data.settings.bindings, systemShortcuts, platform)
        .filter((c) => c.kind !== "internal")
        .map((c) => conflictMessage(c, data, platform))
    : [];
  const failure = failures.find((f) => f.actionId === action && f.accelerator === value);
  if (failure) warnings.push("다른 앱이 이미 쓰고 있어서 등록하지 못했어요");

  return (
    <span className="hotkey">
      <button
        type="button"
        className={recording ? "key recording" : "key"}
        onClick={() => {
          setRejected(null);
          setRecording((r) => !r);
        }}
      >
        {recording ? "키를 누르세요…" : value ? formatAccelerator(value, platform) : "없음"}
      </button>
      {recording && <span className="hint">Esc 취소 · Backspace 지우기</span>}
      {rejected && <span className="warn">⚠ {rejected}</span>}
      {!rejected && warnings.map((w) => <span key={w} className="warn">⚠ {w}</span>)}
    </span>
  );
}
