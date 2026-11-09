/**
 * Background logic. Runs once in the always-on overlay window: loads data, registers the
 * hotkeys and reacts to them. Other windows talk to it through events.
 */
import { bindingsToRegister, planAction, planPhrase } from "../core/actions";
import { detectPlatform } from "../core/hotkeys";
import { copiedOnlyMessage, fellBackMessage, modeChangedMessage } from "../core/messages";
import { todayString } from "../core/render";
import { pushRecent } from "../core/search";
import type { AppData, ItemRef, Mode } from "../core/types";
import {
  checkAccessibility,
  openAccessibilitySettings,
  openEditor,
  pasteText,
  quitApp,
  rememberFrontmost,
  setShortcuts,
  showToast,
} from "../bridge/commands";
import { emitRegistrationResult, onDataChanged, onShortcut } from "../bridge/events";
import { loadAppData, saveAppData } from "../bridge/store";
import { syncTray } from "./tray";

let data: AppData;
const platform = detectPlatform(navigator.userAgent);
let accessibilityOk = true;
const ACCESSIBILITY_POLL_MS = 5000;

export function currentData(): AppData {
  return data;
}

async function update(next: AppData): Promise<void> {
  data = next;
  await saveAppData(data, "controller");
}

async function refreshTray(): Promise<void> {
  accessibilityOk = await checkAccessibility();
  await syncTray(data, platform, accessibilityOk, (id) => void onMenuItem(id));
}

async function setMode(mode: Mode): Promise<void> {
  await update({ ...data, settings: { ...data.settings, mode } });
  await refreshTray();
}

async function onMenuItem(id: string): Promise<void> {
  if (id.startsWith("mode:")) return setMode(id.slice("mode:".length) as Mode);
  if (id.startsWith("template:")) {
    // Opening a menu bar menu does not activate this app, so the user's app is still in front.
    await rememberFrontmost();
    return handleAction(id);
  }
  if (id.startsWith("phrase:")) {
    await rememberFrontmost();
    const plan = planPhrase(id.slice("phrase:".length), data, todayString(new Date()));
    if (plan.kind === "paste") await pasteAndRecord(plan.text, plan.ref);
    return;
  }
  switch (id) {
    case "open-editor":
      return openEditor("templates");
    case "open-settings":
      return openEditor("settings");
    case "open-accessibility":
      return openAccessibilitySettings();
    case "quit":
      return quitApp();
  }
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
      await setMode(plan.next);
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
  await refreshTray();
  await onShortcut((actionId) => void handleAction(actionId));
  await onDataChanged(async ({ source }) => {
    if (source !== "editor") return;
    data = (await loadAppData()).data;
    await registerShortcuts();
    await refreshTray();
  });
  // Pick up a permission granted in System Settings without restarting the app.
  setInterval(() => {
    if (accessibilityOk) return;
    void checkAccessibility().then((ok) => (ok ? refreshTray() : undefined));
  }, ACCESSIBILITY_POLL_MS);
}
