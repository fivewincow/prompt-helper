import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readSystemShortcuts, type EditorTab, type RegistrationFailure } from "../bridge/commands";
import { onDataChanged, onEditorTab, onRegistrationResult } from "../bridge/events";
import { loadAppData, saveAppData } from "../bridge/store";
import { detectPlatform } from "../core/hotkeys";
import type { AppData } from "../core/types";
import { TemplatesTab } from "./TemplatesTab";
import "./editor.css";

const SAVE_DEBOUNCE_MS = 400;
const TABS: Array<[EditorTab, string]> = [
  ["templates", "템플릿"],
  ["phrases", "문구"],
  ["settings", "단축키 · 설정"],
];

function tabFromHash(): EditorTab {
  const h = window.location.hash.slice(1);
  return h === "phrases" || h === "settings" ? h : "templates";
}

export function EditorApp() {
  const [data, setData] = useState<AppData | null>(null);
  const [tab, setTab] = useState<EditorTab>(tabFromHash);
  const [failures, setFailures] = useState<RegistrationFailure[]>([]);
  const [systemShortcuts, setSystemShortcuts] = useState<string[]>([]);
  const platform = detectPlatform(navigator.userAgent);
  const pending = useRef<AppData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const next = pending.current;
    pending.current = null;
    if (next) await saveAppData(next, "editor");
  }, []);

  const change = (next: AppData) => {
    setData(next);
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
  };

  useEffect(() => {
    void loadAppData().then((r) => setData(r.data));
    readSystemShortcuts().then(setSystemShortcuts, () => setSystemShortcuts([]));
    const unlisten = [
      onEditorTab(setTab),
      onRegistrationResult(setFailures),
      // The controller owns the current mode and the recent list; take just those so
      // unsaved edits here are never overwritten (and our next save keeps its values).
      onDataChanged(({ source }) => {
        if (source !== "controller") return;
        void loadAppData().then(({ data: disk }) =>
          setData((d) => d && { ...d, settings: { ...d.settings, mode: disk.settings.mode, recent: disk.settings.recent } }),
        );
      }),
      // Save what is pending before the window goes away.
      getCurrentWindow().onCloseRequested(() => flush()),
    ];
    return () => unlisten.forEach((p) => void p.then((off) => off()));
  }, [flush]);

  if (!data) return <main className="editor loading">불러오는 중…</main>;

  return (
    <main className="editor">
      <header className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className={id === tab ? "tab on" : "tab"} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </header>
      {tab === "templates" && (
        <TemplatesTab
          data={data}
          platform={platform}
          systemShortcuts={systemShortcuts}
          failures={failures}
          onChange={change}
        />
      )}
      {tab !== "templates" && <p className="placeholder-tab">준비 중이에요.</p>}
    </main>
  );
}
