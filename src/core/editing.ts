/** Pure data changes used by the editor window. Each returns a new AppData. */
import type { ActionId, AppData, InsertMode, Mode, Phrase, PhraseCategory, Template } from "./types";

const renumber = (templates: Template[]): Template[] => templates.map((t, i) => ({ ...t, order: i }));

function updateTemplate(d: AppData, id: string, change: (t: Template) => Template): AppData {
  return { ...d, templates: d.templates.map((t) => (t.id === id ? change(t) : t)) };
}

export function setTemplateName(d: AppData, id: string, name: string): AppData {
  return updateTemplate(d, id, (t) => ({ ...t, name }));
}

export function setTemplateBody(d: AppData, id: string, mode: Mode, text: string): AppData {
  return updateTemplate(d, id, (t) => ({ ...t, bodies: { ...t.bodies, [mode]: text } }));
}

export function setTemplateHidden(d: AppData, id: string, hidden: boolean): AppData {
  return updateTemplate(d, id, (t) => ({ ...t, hidden }));
}

export function createTemplate(d: AppData, newId: string): AppData {
  const t: Template = {
    id: newId,
    name: "새 템플릿",
    builtIn: false,
    hidden: false,
    order: d.templates.length,
    bodies: { claude: "", codex: "", gemini: "" },
  };
  return { ...d, templates: renumber([...d.templates, t]) };
}

export function duplicateTemplate(d: AppData, id: string, newId: string): AppData {
  const i = d.templates.findIndex((t) => t.id === id);
  if (i === -1) return d;
  const src = d.templates[i];
  const copy: Template = { ...src, id: newId, name: `${src.name} 복사본`, builtIn: false, hidden: false, bodies: { ...src.bodies } };
  return { ...d, templates: renumber([...d.templates.slice(0, i + 1), copy, ...d.templates.slice(i + 1)]) };
}

export function deleteTemplate(d: AppData, id: string): AppData {
  const t = d.templates.find((x) => x.id === id);
  if (!t || t.builtIn) return d;
  const bindings = { ...d.settings.bindings };
  delete bindings[`template:${id}`];
  const recent = d.settings.recent.filter((r) => !(r.kind === "template" && r.id === id));
  return {
    ...d,
    settings: { ...d.settings, bindings, recent },
    templates: renumber(d.templates.filter((x) => x.id !== id)),
  };
}

export function moveTemplate(d: AppData, id: string, toIndex: number): AppData {
  const from = d.templates.findIndex((t) => t.id === id);
  if (from === -1) return d;
  const rest = d.templates.filter((t) => t.id !== id);
  const to = Math.max(0, Math.min(toIndex, rest.length));
  return { ...d, templates: renumber([...rest.slice(0, to), d.templates[from], ...rest.slice(to)]) };
}

export function copyBodyToModes(d: AppData, id: string, from: Mode, to: Mode[]): AppData {
  return updateTemplate(d, id, (t) => {
    const bodies = { ...t.bodies };
    for (const m of to) bodies[m] = t.bodies[from];
    return { ...t, bodies };
  });
}

export function setBinding(d: AppData, action: ActionId, acc: string | null): AppData {
  return { ...d, settings: { ...d.settings, bindings: { ...d.settings.bindings, [action]: acc } } };
}

export function newId(prefix: "t" | "p"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Human name of a hotkey action, for conflict messages. */
export function actionLabel(action: string, d: AppData): string {
  if (action === "palette") return "검색 팝업";
  if (action === "cycleMode") return "모드 전환";
  const t = d.templates.find((x) => `template:${x.id}` === action);
  return t ? t.name : "삭제된 템플릿";
}

const renumberPhrases = (phrases: Phrase[]): Phrase[] => phrases.map((p, i) => ({ ...p, order: i }));

export function addPhrase(d: AppData, newId: string, category: PhraseCategory): AppData {
  const sorted = [...d.phrases].sort((a, b) => a.order - b.order);
  // Insert right after the last phrase of the same category so it lands at the end of that group.
  let at = sorted.length;
  for (let i = sorted.length - 1; i >= 0; i--)
    if (sorted[i].category === category) {
      at = i + 1;
      break;
    }
  const phrase: Phrase = { id: newId, text: "", category, recommendedModes: "all", order: 0 };
  return { ...d, phrases: renumberPhrases([...sorted.slice(0, at), phrase, ...sorted.slice(at)]) };
}

export function updatePhrase(
  d: AppData,
  id: string,
  patch: Partial<Pick<Phrase, "text" | "category" | "recommendedModes">>,
): AppData {
  return { ...d, phrases: d.phrases.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

export function deletePhrase(d: AppData, id: string): AppData {
  const recent = d.settings.recent.filter((r) => !(r.kind === "phrase" && r.id === id));
  return {
    ...d,
    settings: { ...d.settings, recent },
    phrases: renumberPhrases(d.phrases.filter((p) => p.id !== id)),
  };
}

export function movePhrase(d: AppData, id: string, toIndex: number): AppData {
  const sorted = [...d.phrases].sort((a, b) => a.order - b.order);
  const from = sorted.findIndex((p) => p.id === id);
  if (from === -1) return d;
  const rest = sorted.filter((p) => p.id !== id);
  const to = Math.max(0, Math.min(toIndex, rest.length));
  return { ...d, phrases: renumberPhrases([...rest.slice(0, to), sorted[from], ...rest.slice(to)]) };
}

export function setInsertMode(d: AppData, m: InsertMode): AppData {
  return { ...d, settings: { ...d.settings, insertMode: m } };
}

export function setLaunchAtLogin(d: AppData, on: boolean): AppData {
  return { ...d, settings: { ...d.settings, launchAtLogin: on } };
}
