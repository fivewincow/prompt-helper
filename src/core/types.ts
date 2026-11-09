/** Shared types for the pure core. No Tauri imports anywhere under src/core. */

export type Mode = "claude" | "codex" | "gemini";
export type Platform = "mac" | "windows";
export type Bodies = Record<Mode, string>;

export interface Template {
  id: string;
  name: string;
  builtIn: boolean;
  hidden: boolean;
  order: number;
  bodies: Bodies;
}

export const PHRASE_CATEGORIES = ["진행 방식", "범위", "보고·검증", "자료·맥락", "출력"] as const;
export type PhraseCategory = (typeof PHRASE_CATEGORIES)[number];

export interface Phrase {
  id: string;
  text: string;
  category: PhraseCategory;
  recommendedModes: Mode[] | "all";
  order: number;
}

export type ActionId = `template:${string}` | "palette" | "cycleMode";
export type InsertMode = "fill" | "direct";

export interface ItemRef {
  kind: "template" | "phrase";
  id: string;
}

export interface Settings {
  mode: Mode;
  insertMode: InsertMode;
  launchAtLogin: boolean;
  bindings: Partial<Record<ActionId, string | null>>;
  recent: ItemRef[];
}

export interface AppData {
  settings: Settings;
  templates: Template[];
  phrases: Phrase[];
}

export type GuideKey =
  | "goal"
  | "context"
  | "material"
  | "scope"
  | "done"
  | "output"
  | "process"
  | "symptom"
  | "cases"
  | "general";

export interface GuideEntry {
  key: GuideKey;
  title: string;
  why: string;
  good: string;
  bad: string;
  tips: Partial<Record<Mode | "all", string>>;
  sources: { claude: string } & Partial<Record<"codex" | "gemini", string>>;
}
