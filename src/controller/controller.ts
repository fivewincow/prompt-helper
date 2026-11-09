/**
 * Background logic. Runs once in the always-on overlay window: loads data, registers the
 * hotkeys and reacts to them. Other windows talk to it through events.
 */
import { bindingsToRegister, planAction } from "../core/actions";
import { detectPlatform } from "../core/hotkeys";
import { copiedOnlyMessage, fellBackMessage, modeChangedMessage } from "../core/messages";
import { todayString } from "../core/render";
import { pushRecent } from "../core/search";
import type { AppData, ItemRef } from "../core/types";
import { pasteText, setShortcuts, showToast } from "../bridge/commands";
import { emitRegistrationResult, onDataChanged, onShortcut } from "../bridge/events";
import { loadAppData, saveAppData } from "../bridge/store";

let data: AppData;
const platform = detectPlatform(navigator.userAgent);

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
  if (outcome === "copiedOnly") void showToast(copiedOnlyMessage(platform));
  await update({ ...data, settings: { ...data.settings, recent: pushRecent(data.settings.recent, ref) } });
}

export async function handleAction(actionId: string): Promise<void> {
  const plan = planAction(actionId, data, todayString(new Date()));
  if ((plan.kind === "fill" || plan.kind === "paste") && plan.fellBack) void showToast(fellBackMessage(data.settings.mode));
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
      void showToast(modeChangedMessage(plan.next));
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
