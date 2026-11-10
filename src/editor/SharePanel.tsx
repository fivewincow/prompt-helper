import { useMemo, useState } from "react";
import { exportShareFile, importShareFile } from "../bridge/commands";
import { newId } from "../core/editing";
import { importedMessage } from "../core/messages";
import { todayString } from "../core/render";
import { applyImport, buildBundle, defaultPicks, parseBundle, planImport, type ShareBundle } from "../core/share";
import type { AppData } from "../core/types";

interface Props {
  data: AppData;
  onChange: (next: AppData) => void;
}

type Notice = { kind: "ok" | "error"; text: string } | null;

const toggle = <T,>(set: ReadonlySet<T>, value: T): Set<T> => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
};

/** Settings tab section: export templates and phrases to a file, or import one. */
export function SharePanel({ data, onChange }: Props) {
  const [view, setView] = useState<"idle" | "export" | "import">("idle");
  const [notice, setNotice] = useState<Notice>(null);
  const [incoming, setIncoming] = useState<{ bundle: ShareBundle; dropped: number } | null>(null);

  const startExport = () => {
    setNotice(null);
    setView("export");
  };

  const startImport = async () => {
    setNotice(null);
    try {
      const text = await importShareFile();
      if (text === null) return;
      const parsed = parseBundle(text);
      if (!parsed.ok) {
        setNotice({ kind: "error", text: parsed.error });
        return;
      }
      setIncoming({ bundle: parsed.bundle, dropped: parsed.dropped });
      setView("import");
    } catch (e) {
      setNotice({ kind: "error", text: `파일을 열지 못했어요: ${String(e)}` });
    }
  };


  return (
    <section className="share">
      <h3>공유</h3>
      <p className="note">템플릿과 문구를 파일로 내보내 다른 사람과 주고받아요. 단축키는 넣지 않아요.</p>
      <div className="share-buttons">
        <button type="button" className="btn" onClick={startExport}>
          내보내기…
        </button>
        <button type="button" className="btn" onClick={() => void startImport()}>
          가져오기…
        </button>
      </div>
      {notice && <p className={notice.kind === "ok" ? "share-ok" : "warn"}>{notice.text}</p>}
      {view === "export" && (
        <ExportBox
          data={data}
          onCancel={() => setView("idle")}
          onDone={(n) => {
            setView("idle");
            setNotice(n);
          }}
        />
      )}
      {view === "import" && incoming && (
        <ImportBox
          data={data}
          bundle={incoming.bundle}
          onCancel={() => setView("idle")}
          onImport={(pick) => {
            const { data: next, report } = applyImport(data, incoming.bundle, pick, newId);
            onChange(next);
            setView("idle");
            setNotice({ kind: "ok", text: importedMessage(report, incoming.dropped) });
          }}
        />
      )}
    </section>
  );
}

function ExportBox({
  data,
  onCancel,
  onDone,
}: {
  data: AppData;
  onCancel: () => void;
  onDone: (notice: Notice) => void;
}) {
  const initial = useMemo(() => defaultPicks(data), [data]);
  const [templateIds, setTemplateIds] = useState<ReadonlySet<string>>(() => new Set(initial.templateIds));
  const [phraseIds, setPhraseIds] = useState<ReadonlySet<string>>(() => new Set(initial.phraseIds));
  const templates = [...data.templates].sort((a, b) => a.order - b.order);
  const phrases = [...data.phrases].sort((a, b) => a.order - b.order).filter((p) => p.text.trim() !== "");
  const changed = new Set(initial.templateIds);

  const save = async () => {
    const today = todayString(new Date());
    const bundle = buildBundle(data, [...templateIds], [...phraseIds], today);
    try {
      const saved = await exportShareFile(JSON.stringify(bundle, null, 2), `prompt-helper-templates-${today}.json`);
      if (saved)
        onDone({ kind: "ok", text: `템플릿 ${bundle.templates.length}개, 문구 ${bundle.phrases.length}개를 저장했어요.` });
    } catch (e) {
      onDone({ kind: "error", text: `저장하지 못했어요: ${String(e)}` });
    }
  };

  return (
    <div className="share-box">
      <div className="share-group">
        <div className="share-head">
          템플릿
          <button type="button" className="link" onClick={() => setTemplateIds(new Set(templates.map((t) => t.id)))}>
            모두 선택
          </button>
          <button type="button" className="link" onClick={() => setTemplateIds(new Set())}>
            모두 해제
          </button>
        </div>
        {templates.map((t) => (
          <label key={t.id} className="check share-item">
            <input
              type="checkbox"
              checked={templateIds.has(t.id)}
              onChange={() => setTemplateIds((s) => toggle(s, t.id))}
            />
            <span className="share-text">{t.name}</span>
            {t.builtIn && <span className="share-tag">{changed.has(t.id) ? "기본 · 수정됨" : "기본"}</span>}
          </label>
        ))}
      </div>
      <div className="share-group">
        <div className="share-head">
          문구
          <button type="button" className="link" onClick={() => setPhraseIds(new Set(phrases.map((p) => p.id)))}>
            모두 선택
          </button>
          <button type="button" className="link" onClick={() => setPhraseIds(new Set())}>
            모두 해제
          </button>
        </div>
        {phrases.map((p) => (
          <label key={p.id} className="check share-item">
            <input type="checkbox" checked={phraseIds.has(p.id)} onChange={() => setPhraseIds((s) => toggle(s, p.id))} />
            <span className="share-text">{p.text}</span>
            <span className="share-tag">{p.category}</span>
          </label>
        ))}
      </div>
      <div className="share-actions">
        <button
          type="button"
          className="btn primary"
          disabled={templateIds.size + phraseIds.size === 0}
          onClick={() => void save()}
        >
          저장…
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          취소
        </button>
        <span className="note">
          템플릿 {templateIds.size}개 · 문구 {phraseIds.size}개
        </span>
      </div>
    </div>
  );
}

function ImportBox({
  data,
  bundle,
  onCancel,
  onImport,
}: {
  data: AppData;
  bundle: ShareBundle;
  onCancel: () => void;
  onImport: (pick: { templates: number[]; phrases: number[] }) => void;
}) {
  // Phrases the user already has are skipped no matter what, so they start unchecked and locked.
  const existing = useMemo(() => {
    const all = bundle.phrases.map((_, i) => i);
    const plan = planImport(data, bundle, { templates: [], phrases: all });
    return new Set(plan.phrases.filter((p) => p.duplicate).map((p) => p.index));
  }, [data, bundle]);
  const [templates, setTemplates] = useState<ReadonlySet<number>>(() => new Set(bundle.templates.map((_, i) => i)));
  const [phrases, setPhrases] = useState<ReadonlySet<number>>(
    () => new Set(bundle.phrases.map((_, i) => i).filter((i) => !existing.has(i))),
  );
  const plan = planImport(data, bundle, { templates: [...templates], phrases: [] });
  const finalName = new Map(plan.templates.map((t) => [t.index, t.finalName]));

  return (
    <div className="share-box">
      <p className="note">
        {bundle.exportedAt ? `${bundle.exportedAt}에 만든 파일이에요. ` : ""}가져올 항목을 골라 주세요. 가져온 템플릿은 '내
        템플릿'에 추가되고, 지금 있는 템플릿은 바뀌지 않아요.
      </p>
      {bundle.templates.length > 0 && (
        <div className="share-group">
          <div className="share-head">템플릿</div>
          {bundle.templates.map((t, i) => {
            const renamed = finalName.get(i);
            return (
              <label key={i} className="check share-item">
                <input type="checkbox" checked={templates.has(i)} onChange={() => setTemplates((s) => toggle(s, i))} />
                <span className="share-text">{t.name}</span>
                {renamed && renamed !== t.name && <span className="share-tag warn-tag">'{renamed}'로 추가돼요</span>}
              </label>
            );
          })}
        </div>
      )}
      {bundle.phrases.length > 0 && (
        <div className="share-group">
          <div className="share-head">문구</div>
          {bundle.phrases.map((p, i) => (
            <label key={i} className={existing.has(i) ? "check share-item muted" : "check share-item"}>
              <input
                type="checkbox"
                disabled={existing.has(i)}
                checked={phrases.has(i)}
                onChange={() => setPhrases((s) => toggle(s, i))}
              />
              <span className="share-text">{p.text}</span>
              <span className="share-tag">{existing.has(i) ? "이미 있어요" : p.category}</span>
            </label>
          ))}
        </div>
      )}
      <div className="share-actions">
        <button
          type="button"
          className="btn primary"
          disabled={templates.size + phrases.size === 0}
          onClick={() => onImport({ templates: [...templates], phrases: [...phrases] })}
        >
          가져오기
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
}
