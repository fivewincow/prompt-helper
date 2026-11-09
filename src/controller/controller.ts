/**
 * Background logic. Runs once in the always-on overlay window: loads data, registers the
 * hotkeys and reacts to them. Other windows talk to it through events.
 */
import { bindingsToRegister, planAction } from "../core/actions";
import { todayString } from "../core/render";
import { pushRecent } from "../core/search";
import type { AppData, ItemRef } from "../core/types";
import { pasteText, setShortcuts } from "../bridge/commands";
import { emitRegistrationResult, onDataChanged, onShortcut } from "../bridge/events";
import { loadAppData, saveAppData } from "../bridge/store";

let data: AppData;

export function currentData(): AppData {
  return data;
}

async function update(next: AppData): Promise<void> {
  data = next;
  await saveAppData(data, "controller");
}

async function registerShortcuts(): Promise<void> {
  const failures = await setShortcuts(bindingsToRegister(data));
  await emitRegistrationResult(failures);
}

/** Pastes into the remembered app and records the item as recently used. */
export async function pasteAndRecord(text: string, ref: ItemRef): Promise<void> {
  const outcome = await pasteText(text);
  if (outcome === "copiedOnly") console.warn("No Accessibility permission: text copied to the clipboard only.");
  await update({ ...data, settings: { ...data.settings, recent: pushRecent(data.settings.recent, ref) } });
}

export async function handleAction(actionId: string): Promise<void> {
  const plan = planAction(actionId, data, todayString(new Date()));
  switch (plan.kind) {
    case "fill":
      // Until the fill window exists (Task 13), a fill plan pastes directly.
      await pasteAndRecord(plan.text, { kind: "template", id: plan.templateId });
      return;
    case "paste":
      await pasteAndRecord(plan.text, plan.ref);
      return;
    case "cycleMode":
      await update({ ...data, settings: { ...data.settings, mode: plan.next } });
      return;
    case "palette": // Task 14
    case "none":
      return;
  }
}

export async function startController(): Promise<void> {
  data = (await loadAppData()).data;
  await registerShortcuts();
  await onShortcut((actionId) => void handleAction(actionId));
  await onDataChanged(async ({ source }) => {
    if (source !== "editor") return;
    data = (await loadAppData()).data;
    await registerShortcuts();
  });
}
