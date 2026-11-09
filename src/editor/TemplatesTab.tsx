import { useState } from "react";
import type { RegistrationFailure } from "../bridge/commands";
import { resetTemplate } from "../core/data";
import {
  copyBodyToModes,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  moveTemplate,
  newId,
  setBinding,
  setTemplateBody,
  setTemplateHidden,
  setTemplateName,
} from "../core/editing";
import { formatAccelerator } from "../core/hotkeys";
import { MODES, MODE_INFO } from "../core/modes";
import type { ActionId, AppData, Mode, Platform, Template } from "../core/types";
import { HighlightedTextarea } from "../ui/HighlightedTextarea";
import { GuidePanel } from "./GuidePanel";
import { HotkeyRecorder } from "./HotkeyRecorder";

interface Props {
  data: AppData;
  platform: Platform;
  systemShortcuts: readonly string[];
  failures: RegistrationFailure[];
  onChange: (next: AppData) => void;
}

type Confirm = "copy" | "delete" | "reset" | null;

export function TemplatesTab({ data, platform, systemShortcuts, failures, onChange }: Props) {
  const [selectedId, setSelectedId] = useState(data.templates[0]?.id);
  const [mode, setMode] = useState<Mode>(data.settings.mode);
  const [cursor, setCursor] = useState(0);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const selected = data.templates.find((t) => t.id === selectedId) ?? data.templates[0];
  const index = data.templates.findIndex((t) => t.id === selected?.id);
  const others = MODES.filter((m) => m !== mode);

  const select = (id: string) => {
    setSelectedId(id);
    setCursor(0);
    setConfirm(null);
  };

  const row = (t: Template) => {
    const acc = data.settings.bindings[`template:${t.id}` as ActionId];
    return (
      <li key={t.id}>
        <button type="button" className={t.id === selected?.id ? "tpl on" : "tpl"} onClick={() => select(t.id)}>
          <span className={t.hidden ? "tpl-name hidden" : "tpl-name"}>{t.name}</span>
          {acc && <span className="kbd">{formatAccelerator(acc, platform)}</span>}
        </button>
      </li>
    );
  };

  return (
    <div className="templates">
      <nav className="tpl-list">
        <div className="group">기본 템플릿</div>
        <ul>{data.templates.filter((t) => t.builtIn).map(row)}</ul>
        <div className="group">내 템플릿</div>
        <ul>{data.templates.filter((t) => !t.builtIn).map(row)}</ul>
        <div className="tpl-actions">
          <button
            type="button"
            className="link"
            onClick={() => {
              const id = newId("t");
              onChange(createTemplate(data, id));
              select(id);
            }}
          >
            + 새 템플릿
          </button>
          {selected && (
            <button
              type="button"
              className="link"
              onClick={() => {
                const id = newId("t");
                onChange(duplicateTemplate(data, selected.id, id));
                select(id);
              }}
            >
              복제
            </button>
          )}
          {selected && (
            <span className="order">
              <button type="button" title="위로" disabled={index <= 0} onClick={() => onChange(moveTemplate(data, selected.id, index - 1))}>
                ▲
              </button>
              <button
                type="button"
                title="아래로"
                disabled={index >= data.templates.length - 1}
                onClick={() => onChange(moveTemplate(data, selected.id, index + 1))}
              >
                ▼
              </button>
            </span>
          )}
        </div>
      </nav>

      {selected && (
        <section className="tpl-main">
          <div className="tpl-head">
            <input
              className="tpl-name-input"
              value={selected.name}
              onChange={(e) => onChange(setTemplateName(data, selected.id, e.target.value))}
            />
            <div className="modes">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={m === mode ? "mode on" : "mode"}
                  onClick={() => {
                    setMode(m);
                    setConfirm(null);
                  }}
                >
                  {MODE_INFO[m].label}
                  {selected.bodies[m].trim() === "" && <span className="empty-dot" title="비어 있어요" />}
                </button>
              ))}
            </div>
          </div>

          <HighlightedTextarea
            key={`${selected.id}:${mode}`}
            value={selected.bodies[mode]}
            onChange={(text, sel) => {
              onChange(setTemplateBody(data, selected.id, mode, text));
              setCursor(sel.start);
            }}
            onSelect={(sel) => setCursor(sel.start)}
          />
          {selected.bodies[mode].trim() === "" && mode !== "claude" && (
            <p className="note">비어 있으면 이 모드에서는 Claude Code 버전을 대신 넣어요.</p>
          )}

          <div className="tpl-row">
            <span className="label">단축키</span>
            <HotkeyRecorder
              action={`template:${selected.id}`}
              data={data}
              platform={platform}
              systemShortcuts={systemShortcuts}
              failures={failures}
              onChange={(acc) => onChange(setBinding(data, `template:${selected.id}`, acc))}
            />
          </div>

          <div className="tpl-row">
            {selected.builtIn &&
              (confirm === "reset" ? (
                <span className="confirm">
                  세 모드의 본문과 이름을 모두 기본값으로 되돌릴까요?
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => {
                      onChange(resetTemplate(data, selected.id));
                      setConfirm(null);
                    }}
                  >
                    되돌리기
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirm(null)}>
                    취소
                  </button>
                </span>
              ) : (
                <button type="button" className="btn" onClick={() => setConfirm("reset")}>
                  기본값으로
                </button>
              ))}
            {confirm === "copy" ? (
              <span className="confirm">
                {others.map((m) => MODE_INFO[m].label).join(", ")} 버전을 덮어쓸까요?
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    onChange(copyBodyToModes(data, selected.id, mode, others));
                    setConfirm(null);
                  }}
                >
                  덮어쓰기
                </button>
                <button type="button" className="btn" onClick={() => setConfirm(null)}>
                  취소
                </button>
              </span>
            ) : (
              <button type="button" className="btn" onClick={() => setConfirm("copy")}>
                다른 모드에 복사
              </button>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={selected.hidden}
                onChange={(e) => onChange(setTemplateHidden(data, selected.id, e.target.checked))}
              />
              메뉴와 팝업에서 숨기기
            </label>
            {!selected.builtIn &&
              (confirm === "delete" ? (
                <span className="confirm">
                  삭제할까요?
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => {
                      onChange(deleteTemplate(data, selected.id));
                      select(data.templates[0].id);
                    }}
                  >
                    삭제
                  </button>
                  <button type="button" className="btn" onClick={() => setConfirm(null)}>
                    취소
                  </button>
                </span>
              ) : (
                <button type="button" className="btn danger" onClick={() => setConfirm("delete")}>
                  삭제
                </button>
              ))}
          </div>
        </section>
      )}

      {selected && <GuidePanel text={selected.bodies[mode]} cursor={cursor} mode={mode} />}
    </div>
  );
}
