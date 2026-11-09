import { DEFAULT_PHRASES } from "./defaults/phrases";
import { DEFAULT_TEMPLATES } from "./defaults/templates";
import { DEFAULT_BINDINGS } from "./hotkeys";
import { MODES } from "./modes";
import type { AppData, Bodies, Phrase, Settings, Template } from "./types";

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

function applyOverride(t: Template, o: TemplateOverride | undefined): Template {
  if (!o) return { ...t, bodies: { ...t.bodies } };
  return {
    ...t,
    name: o.name ?? t.name,
    hidden: o.hidden ?? t.hidden,
    order: o.order ?? t.order,
    bodies: { ...t.bodies, ...o.bodies },
  };
}

const byOrder = (a: Template, b: Template) => a.order - b.order;

export function mergeWithDefaults(stored: StoredData | null, defaults: Defaults = DEFAULTS): AppData {
  const base = defaultSettings();
  const s = stored?.settings ?? {};
  const settings: Settings = { ...base, ...s, bindings: { ...base.bindings, ...s.bindings } };
  const builtIns = defaults.templates.map((t) => applyOverride(t, stored?.templateOverrides[t.id]));
  const customs = (stored?.customTemplates ?? []).map((t) => applyOverride(t, undefined));
  const phrases = (stored?.phrases ?? defaults.phrases).map((p) => ({ ...p }));
  return { settings, templates: [...builtIns, ...customs].sort(byOrder), phrases };
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
  const templates = data.templates.map((t) => (t.id === id ? applyOverride(d, undefined) : t)).sort(byOrder);
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
