/**
 * Sharing templates and phrases as a file: what goes into it, how a received file is checked,
 * and how it is added to the user's data. Imports only ever add; nothing the user has changes.
 */
import { DEFAULTS } from "./data";
import { addPhrase, createTemplate, setTemplateName, updatePhrase } from "./editing";
import { MODES } from "./modes";
import { PHRASE_CATEGORIES, type AppData, type Bodies, type Mode, type PhraseCategory } from "./types";

export const SHARE_FORMAT = "prompt-helper-templates";
export const SHARE_VERSION = 1;
/** Larger files are refused before parsing (also checked in Rust when the file is read). */
export const SHARE_MAX_BYTES = 1_000_000;

/** No ids, hotkeys, order or hidden flags: those are the sender's own and mean nothing to others. */
export interface SharedTemplate {
  name: string;
  bodies: Bodies;
}

export interface SharedPhrase {
  category: PhraseCategory;
  text: string;
  recommendedModes: Mode[] | "all";
}

export interface ShareBundle {
  format: typeof SHARE_FORMAT;
  version: number;
  exportedAt: string;
  templates: SharedTemplate[];
  phrases: SharedPhrase[];
}

export type ShareParseResult = { ok: true; bundle: ShareBundle; dropped: number } | { ok: false; error: string };

/** Indexes into a bundle's templates and phrases. */
export interface ImportPick {
  templates: readonly number[];
  phrases: readonly number[];
}

export interface ImportPlan {
  templates: { index: number; finalName: string }[];
  phrases: { index: number; duplicate: boolean }[];
}

export interface ImportReport {
  templates: number;
  phrases: number;
  skippedPhrases: number;
  renamed: number;
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export function buildBundle(
  data: AppData,
  templateIds: readonly string[],
  phraseIds: readonly string[],
  today: string,
): ShareBundle {
  const pickedTemplates = new Set(templateIds);
  const pickedPhrases = new Set(phraseIds);
  return {
    format: SHARE_FORMAT,
    version: SHARE_VERSION,
    exportedAt: today,
    templates: [...data.templates]
      .sort(byOrder)
      .filter((t) => pickedTemplates.has(t.id))
      .map((t) => ({ name: t.name, bodies: { ...t.bodies } })),
    phrases: [...data.phrases]
      .sort(byOrder)
      .filter((p) => pickedPhrases.has(p.id))
      .map((p) => ({
        category: p.category,
        text: p.text,
        recommendedModes: Array.isArray(p.recommendedModes) ? [...p.recommendedModes] : "all",
      })),
  };
}

/** What the export list starts with checked: everything the user made or changed. */
export function defaultPicks(data: AppData): { templateIds: string[]; phraseIds: string[] } {
  const templateIds = [...data.templates]
    .sort(byOrder)
    .filter((t) => {
      if (!t.builtIn) return true;
      const d = DEFAULTS.templates.find((x) => x.id === t.id);
      return !d || d.name !== t.name || MODES.some((m) => d.bodies[m] !== t.bodies[m]);
    })
    .map((t) => t.id);
  const phraseIds = [...data.phrases]
    .sort(byOrder)
    .filter((p) => {
      if (p.text.trim() === "") return false;
      const d = DEFAULTS.phrases.find((x) => x.id === p.id);
      return !d || d.text !== p.text || d.category !== p.category;
    })
    .map((p) => p.id);
  return { templateIds, phraseIds };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function readTemplate(v: unknown): SharedTemplate | null {
  if (!isObject(v) || typeof v.name !== "string" || v.name.trim() === "") return null;
  const raw = isObject(v.bodies) ? v.bodies : {};
  const bodies = Object.fromEntries(MODES.map((m) => [m, typeof raw[m] === "string" ? raw[m] : ""])) as Bodies;
  return { name: v.name.trim(), bodies };
}

function readPhrase(v: unknown): SharedPhrase | null {
  if (!isObject(v) || typeof v.text !== "string" || v.text.trim() === "") return null;
  const category = PHRASE_CATEGORIES.find((c) => c === v.category);
  if (!category) return null;
  const modes = Array.isArray(v.recommendedModes)
    ? MODES.filter((m) => (v.recommendedModes as unknown[]).includes(m))
    : [];
  return { category, text: v.text, recommendedModes: modes.length > 0 ? modes : "all" };
}

/** Checks a received file. Broken items are left out and counted rather than failing the file. */
export function parseBundle(text: string): ShareParseResult {
  if (new TextEncoder().encode(text).length > SHARE_MAX_BYTES)
    return { ok: false, error: "파일이 너무 커요. 1MB 이하 파일만 가져올 수 있어요." };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSON 파일이 아니에요." };
  }
  if (!isObject(raw) || raw.format !== SHARE_FORMAT || typeof raw.version !== "number" || raw.version < 1)
    return { ok: false, error: "Prompt Helper 템플릿 파일이 아니에요." };
  if (raw.version > SHARE_VERSION)
    return { ok: false, error: "더 새 버전의 Prompt Helper에서 만든 파일이에요. 앱을 업데이트한 뒤 가져와 주세요." };

  const rawTemplates = Array.isArray(raw.templates) ? raw.templates : [];
  const rawPhrases = Array.isArray(raw.phrases) ? raw.phrases : [];
  const templates = rawTemplates.map(readTemplate).filter((t): t is SharedTemplate => t !== null);
  const phrases = rawPhrases.map(readPhrase).filter((p): p is SharedPhrase => p !== null);
  return {
    ok: true,
    dropped: rawTemplates.length - templates.length + (rawPhrases.length - phrases.length),
    bundle: {
      format: SHARE_FORMAT,
      version: raw.version,
      exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
      templates,
      phrases,
    },
  };
}

/** Final names for the picked templates (a taken name gets " (2)", " (3)"…) and which phrases already exist. */
export function planImport(data: AppData, bundle: ShareBundle, pick: ImportPick): ImportPlan {
  const takenNames = new Set(data.templates.map((t) => t.name.trim()));
  const templates = [...new Set(pick.templates)]
    .filter((i) => bundle.templates[i] !== undefined)
    .sort((a, b) => a - b)
    .map((index) => {
      const name = bundle.templates[index].name.trim();
      let finalName = name;
      for (let n = 2; takenNames.has(finalName); n++) finalName = `${name} (${n})`;
      takenNames.add(finalName);
      return { index, finalName };
    });

  const knownTexts = new Set(data.phrases.map((p) => p.text.trim()));
  const phrases = [...new Set(pick.phrases)]
    .filter((i) => bundle.phrases[i] !== undefined)
    .sort((a, b) => a - b)
    .map((index) => {
      const text = bundle.phrases[index].text.trim();
      const duplicate = knownTexts.has(text);
      knownTexts.add(text);
      return { index, duplicate };
    });
  return { templates, phrases };
}

/** Adds the picked items as new custom templates and phrases. */
export function applyImport(
  data: AppData,
  bundle: ShareBundle,
  pick: ImportPick,
  nextId: (kind: "t" | "p") => string,
): { data: AppData; report: ImportReport } {
  const plan = planImport(data, bundle, pick);
  let d = data;
  for (const { index, finalName } of plan.templates) {
    const id = nextId("t");
    d = setTemplateName(createTemplate(d, id), id, finalName);
    const bodies = { ...bundle.templates[index].bodies };
    d = { ...d, templates: d.templates.map((t) => (t.id === id ? { ...t, bodies } : t)) };
  }
  let added = 0;
  for (const { index, duplicate } of plan.phrases) {
    if (duplicate) continue;
    const p = bundle.phrases[index];
    const id = nextId("p");
    d = updatePhrase(addPhrase(d, id, p.category), id, {
      text: p.text,
      recommendedModes: Array.isArray(p.recommendedModes) ? [...p.recommendedModes] : "all",
    });
    added++;
  }
  return {
    data: d,
    report: {
      templates: plan.templates.length,
      phrases: added,
      skippedPhrases: plan.phrases.length - added,
      renamed: plan.templates.filter((t) => t.finalName !== bundle.templates[t.index].name.trim()).length,
    },
  };
}
