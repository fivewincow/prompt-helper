import { DEFAULT_PHRASES } from "./defaults/phrases";
import { DEFAULT_TEMPLATES } from "./defaults/templates";
import { DEFAULT_BINDINGS } from "./hotkeys";
import { MODES } from "./modes";
import { PHRASE_CATEGORIES, type AppData, type Bodies, type ItemRef, type Mode, type Phrase, type Settings, type Template } from "./types";

/*
 * data.json stores only what differs from the built-in defaults, so that shipping new
 * default templates never overwrites what the user changed.
 */

export const SCHEMA_VERSION = 1;

export interface Defaults {
  templates: Template[];
  phrases: Phrase[];
}

export const DEFAULTS: Defaults = { templates: DEFAULT_TEMPLATES, phrases: DEFAULT_PHRASES };

export type TemplateOverride = Partial<{ name: string; hidden: boolean; order: number; bodies: Partial<Bodies> }>;

export interface StoredData {
  schemaVersion: 1;
  settings: Partial<Settings>;
  templateOverrides: Record<string, TemplateOverride>;
  customTemplates: Template[];
  phrases: Phrase[] | null;
}

export function defaultSettings(): Settings {
  return { mode: "claude", insertMode: "fill", launchAtLogin: true, bindings: { ...DEFAULT_BINDINGS }, recent: [] };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isMode = (v: unknown): v is Mode => typeof v === "string" && (MODES as readonly string[]).includes(v);

/*
 * data.json may be hand-edited or written by another version, so every field is checked on
 * the way in: a bad value falls back to its default on its own instead of breaking startup.
 */
function sanitizeSettings(raw: unknown): Settings {
  const base = defaultSettings();
  const s = isRecord(raw) ? raw : {};
  const bindings = { ...base.bindings };
  if (isRecord(s.bindings))
    for (const [k, v] of Object.entries(s.bindings)) if (typeof v === "string" || v === null) (bindings as Record<string, string | null>)[k] = v;
  const recent = Array.isArray(s.recent)
    ? s.recent.filter(
        (r): r is ItemRef => isRecord(r) && (r.kind === "template" || r.kind === "phrase") && typeof r.id === "string",
      )
    : [];
  return {
    mode: isMode(s.mode) ? s.mode : base.mode,
    insertMode: s.insertMode === "fill" || s.insertMode === "direct" ? s.insertMode : base.insertMode,
    launchAtLogin: typeof s.launchAtLogin === "boolean" ? s.launchAtLogin : base.launchAtLogin,
    bindings,
    recent,
  };
}

function isBodies(v: unknown): v is Bodies {
  return isRecord(v) && MODES.every((m) => typeof v[m] === "string");
}

function isTemplate(v: unknown): v is Template {
  return (
    isRecord(v) &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.hidden === "boolean" &&
    typeof v.order === "number" &&
    isBodies(v.bodies)
  );
}

function isPhrase(v: unknown): v is Phrase {
  return (
    isRecord(v) &&
    typeof v.id === "string" &&
    typeof v.text === "string" &&
    typeof v.order === "number" &&
    (PHRASE_CATEGORIES as readonly unknown[]).includes(v.category) &&
    (v.recommendedModes === "all" || (Array.isArray(v.recommendedModes) && v.recommendedModes.every(isMode)))
  );
}

function applyOverride(t: Template, raw: unknown): Template {
  if (!isRecord(raw)) return { ...t, bodies: { ...t.bodies } };
  const bodies = { ...t.bodies };
  if (isRecord(raw.bodies)) for (const m of MODES) if (typeof raw.bodies[m] === "string") bodies[m] = raw.bodies[m] as string;
  return {
    ...t,
    name: typeof raw.name === "string" ? raw.name : t.name,
    hidden: typeof raw.hidden === "boolean" ? raw.hidden : t.hidden,
    order: typeof raw.order === "number" ? raw.order : t.order,
    bodies,
  };
}

const byOrder = (a: Template, b: Template) => a.order - b.order;

export function mergeWithDefaults(stored: StoredData | null, defaults: Defaults = DEFAULTS): AppData {
  const overrides: Record<string, unknown> = isRecord(stored?.templateOverrides) ? stored.templateOverrides : {};
  const builtIns = defaults.templates.map((t) => applyOverride(t, overrides[t.id]));
  const customs = (Array.isArray(stored?.customTemplates) ? stored.customTemplates : [])
    .filter(isTemplate)
    .map((t) => ({ ...t, builtIn: false, bodies: { ...t.bodies } }));
  const phrases = (Array.isArray(stored?.phrases) ? stored.phrases.filter(isPhrase) : defaults.phrases).map((p) => ({ ...p }));
  return { settings: sanitizeSettings(stored?.settings), templates: [...builtIns, ...customs].sort(byOrder), phrases };
}

function diffTemplate(t: Template, d: Template): TemplateOverride | null {
  const o: TemplateOverride = {};
  if (t.name !== d.name) o.name = t.name;
  if (t.hidden !== d.hidden) o.hidden = t.hidden;
  if (t.order !== d.order) o.order = t.order;
  const bodies: Partial<Bodies> = {};
  for (const m of MODES) if (t.bodies[m] !== d.bodies[m]) bodies[m] = t.bodies[m];
  if (Object.keys(bodies).length > 0) o.bodies = bodies;
  return Object.keys(o).length > 0 ? o : null;
}

/** Key-order-insensitive structural equality for plain JSON values. */
function sameJson(a: unknown, b: unknown): boolean {
  const canon = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canon)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canon((v as Record<string, unknown>)[k])]),
          )
        : v;
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

export function toStored(data: AppData, defaults: Defaults = DEFAULTS): StoredData {
  const defaultById = new Map(defaults.templates.map((t) => [t.id, t]));
  const templateOverrides: Record<string, TemplateOverride> = {};
  const customTemplates: Template[] = [];
  for (const t of data.templates) {
    const d = defaultById.get(t.id);
    if (!d) {
      customTemplates.push(t);
      continue;
    }
    const o = diffTemplate(t, d);
    if (o) templateOverrides[t.id] = o;
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: data.settings,
    templateOverrides,
    customTemplates,
    phrases: sameJson(data.phrases, defaults.phrases) ? null : data.phrases,
  };
}

export function resetTemplate(data: AppData, id: string, defaults: Defaults = DEFAULTS): AppData {
  const d = defaults.templates.find((t) => t.id === id);
  if (!d) return data;
  // Restore the content (name, bodies, hidden) but keep the position the user gave it.
  const templates = data.templates.map((t) => (t.id === id ? { ...applyOverride(d, undefined), order: t.order } : t)).sort(byOrder);
  return { ...data, templates };
}

export type ParseResult =
  | { ok: true; value: StoredData }
  | { ok: false; reason: "invalid-json" | "unsupported-version" | "invalid-shape" };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Validates only the top-level shape; merging fills anything missing below it. */
export function parseStored(raw: string): ParseResult {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
  if (!isObject(v)) return { ok: false, reason: "invalid-shape" };
  if (typeof v.schemaVersion === "number" && v.schemaVersion !== SCHEMA_VERSION)
    return { ok: false, reason: "unsupported-version" };
  const shapeOk =
    v.schemaVersion === SCHEMA_VERSION &&
    isObject(v.settings) &&
    isObject(v.templateOverrides) &&
    Array.isArray(v.customTemplates) &&
    (v.phrases === null || Array.isArray(v.phrases));
  if (!shapeOk) return { ok: false, reason: "invalid-shape" };
  return { ok: true, value: v as unknown as StoredData };
}
