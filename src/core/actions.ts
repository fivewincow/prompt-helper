import { MODE_INFO, nextMode } from "./modes";
import { renderText, resolveBody } from "./render";
import type { ActionId, AppData, Binding, ItemRef, Mode } from "./types";

export type { Binding } from "./types";

/** What the controller should do in response to a hotkey or menu choice. */
export type ActionPlan =
  | { kind: "fill"; templateId: string; title: string; text: string; fellBack: boolean }
  | { kind: "paste"; text: string; fellBack: boolean; ref: ItemRef }
  | { kind: "palette" }
  | { kind: "cycleMode"; next: Mode }
  | { kind: "none" };

export function planAction(actionId: string, data: AppData, today: string): ActionPlan {
  if (actionId === "palette") return { kind: "palette" };
  if (actionId === "cycleMode") return { kind: "cycleMode", next: nextMode(data.settings.mode) };
  if (!actionId.startsWith("template:")) return { kind: "none" };

  const id = actionId.slice("template:".length);
  const t = data.templates.find((x) => x.id === id && !x.hidden);
  if (!t) return { kind: "none" };

  const mode = data.settings.mode;
  const { body, fellBack } = resolveBody(t, mode);
  const text = renderText(body, { today, mode });
  if (data.settings.insertMode === "direct") return { kind: "paste", text, fellBack, ref: { kind: "template", id } };
  return { kind: "fill", templateId: id, title: `${t.name} · ${MODE_INFO[mode].label}`, text, fellBack };
}

export function planPhrase(phraseId: string, data: AppData, today: string): ActionPlan {
  const p = data.phrases.find((x) => x.id === phraseId);
  if (!p) return { kind: "none" };
  return {
    kind: "paste",
    text: renderText(p.text, { today, mode: data.settings.mode }),
    fellBack: false,
    ref: { kind: "phrase", id: phraseId },
  };
}

/** Hotkeys to register: set bindings for visible templates, plus the palette and mode cycle. */
export function bindingsToRegister(data: AppData): Binding[] {
  const visible = new Set(data.templates.filter((t) => !t.hidden).map((t) => `template:${t.id}`));
  const out: Binding[] = [];
  for (const [actionId, accelerator] of Object.entries(data.settings.bindings) as [ActionId, string | null][]) {
    if (!accelerator) continue;
    if (actionId.startsWith("template:") && !visible.has(actionId)) continue;
    out.push({ actionId, accelerator });
  }
  return out;
}
