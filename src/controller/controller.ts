/**
 * Background logic. Runs once in the always-on overlay window: loads data, registers the
 * hotkeys and reacts to them. Other windows talk to it through events.
 */
import { bindingsToRegister, planAction, planPhrase } from "../core/actions";
import { detectPlatform } from "../core/hotkeys";
import { copiedOnlyMessage, fellBackMessage, modeChangedMessage } from "../core/messages";
import { mergeWithDefaults } from "../core/data";
import { todayString } from "../core/render";
import { pushRecent } from "../core/search";
import type { AppData, ItemRef, Mode } from "../core/types";
import {
  checkAccessibility,
  hideOverlay,
  openAccessibilitySettings,
  openEditor,
  pasteText,
  quitApp,
  rememberFrontmost,
  restoreFocus,
  setShortcuts,
  showOverlay,
  showToast,
} from "../bridge/commands";
import { emitRegistrationResult, onDataChanged, onEditorClosed, onRecording, onShortcut } from "../bridge/events";
import { loadAppData, saveAppData } from "../bridge/store";
import { enable as enableAutostart } from "@tauri-apps/plugin-autostart";
import { overlayStore } from "../overlay/overlayStore";
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
      overlayStore.setView("fill", data);
      overlayStore.dispatchFill({ type: "open", templateId: plan.templateId, title: plan.title, text: plan.text });
      await showOverlay("fill");
      return;
    case "paste":
      await pasteAndRecord(plan.text, plan.ref);
      return;
    case "cycleMode":
      await setMode(plan.next);
      void showToast(modeChangedMessage(plan.next));
      return;
    case "palette": {
      const view = overlayStore.get().view;
      // While the fill window is open, the palette key opens its phrase search instead.
      if (view === "fill") {
        overlayStore.dispatchFill({ type: "key", input: primaryKey("k") });
        await showOverlay("fill");
      } else if (view === "palette") {
        // Pressing the palette key again closes it.
        overlayStore.paletteEvent({ type: "close", reason: "escape" });
      } else {
        overlayStore.openPalette(data);
        await showOverlay("palette");
      }
      return;
    }
    case "none":
      return;
  }
}

/** A palette choice: phrases paste right away, templates go through the normal template path. */
async function choosePaletteItem(ref: ItemRef): Promise<void> {
  const today = todayString(new Date());
  if (ref.kind === "phrase") {
    // paste_text brings the user's app back and then hides the overlay (see paste.rs).
    const plan = planPhrase(ref.id, data, today);
    if (plan.kind === "paste") await pasteAndRecord(plan.text, plan.ref);
    return;
  }
  const plan = planAction(`template:${ref.id}`, data, today);
  if (plan.kind === "fill") {
    // The palette turns into the fill window in place; record the choice now.
    await update({ ...data, settings: { ...data.settings, recent: pushRecent(data.settings.recent, ref) } });
    if (plan.fellBack) void showToast(fellBackMessage(data.settings.mode));
    overlayStore.setView("fill", data);
    overlayStore.dispatchFill({ type: "open", templateId: plan.templateId, title: plan.title, text: plan.text });
    await showOverlay("fill");
  } else if (plan.kind === "paste") {
    await pasteAndRecord(plan.text, plan.ref);
  }
}

/** A synthetic Cmd/Ctrl+<letter> press for the fill reducer. */
function primaryKey(letter: string) {
  return {
    key: letter,
    code: `Key${letter.toUpperCase()}`,
    metaKey: platform === "mac",
    ctrlKey: platform === "windows",
    shiftKey: false,
    isComposing: false,
  };
}

/** Runs a startup step; a failure is reported instead of stopping the rest of startup. */
async function safely(label: string, step: () => Promise<void>): Promise<void> {
  try {
    await step();
  } catch (e) {
    console.error(label, e);
    void showToast(`${label}에 실패했어요`).catch(() => {});
  }
}

/** First launch: turn on launch-at-login (the default) and explain the permission if missing. */
async function firstRunSetup(): Promise<void> {
  // Dev builds (`tauri dev`) would register the debug binary, which cannot start without the
  // Vite server; only real builds turn on launch-at-login by default.
  if (data.settings.launchAtLogin && !import.meta.env.DEV)
    await enableAutostart().catch((e) => console.warn("autostart", e));
  await saveAppData(data, "controller");
  if (platform === "mac" && !accessibilityOk) await openEditor("settings");
}

export async function startController(): Promise<void> {
  overlayStore.setPlatform(platform);
  // Both Rust commands activate the user's app first and then hide the overlay.
  overlayStore.onFillEffect(async (effect, closing) => {
    if (effect.type === "paste") {
      await pasteAndRecord(effect.text, { kind: "template", id: closing.templateId });
      // Only now: if the paste failed, the writing is still there as a draft.
      overlayStore.dropDraft(closing.templateId);
    } else await restoreFocus();
  });
  overlayStore.onPaletteEvent(async (e) => {
    if (e.type === "choose") return choosePaletteItem(e.ref);
    // Escape returns to where the user was; a click elsewhere already moved focus there.
    if (e.reason === "escape") await restoreFocus();
    else await hideOverlay();
  });
  let loaded: Awaited<ReturnType<typeof loadAppData>>;
  try {
    loaded = await loadAppData();
  } catch (e) {
    console.error("could not load data; starting from defaults", e);
    loaded = { data: mergeWithDefaults(null), recovered: false, firstRun: false };
  }
  data = loaded.data;
  // Listeners first: this is a menu-bar-only app, so if a later step failed and nothing
  // were listening, it would be running but impossible to use or even quit.
  await onShortcut((actionId) => void handleAction(actionId));
  await onDataChanged(async ({ source }) => {
    if (source !== "editor") return;
    data = (await loadAppData()).data;
    await registerShortcuts();
    await refreshTray();
  });
  // While the editor records a hotkey, our own hotkeys would swallow the keys; pause them.
  // If the editor closes before recording ends, resume them anyway.
  let paused = false;
  await onRecording((active) => {
    paused = active;
    void (active ? setShortcuts([]) : registerShortcuts());
  });
  await onEditorClosed(() => {
    if (!paused) return;
    paused = false;
    void registerShortcuts();
  });
  await safely("단축키 등록", registerShortcuts);
  await safely("메뉴바 메뉴", refreshTray);
  if (loaded.firstRun) await safely("처음 실행 설정", firstRunSetup);
  // Pick up a permission granted in System Settings without restarting the app.
  setInterval(() => {
    if (accessibilityOk) return;
    void checkAccessibility().then((ok) => (ok ? refreshTray() : undefined));
  }, ACCESSIBILITY_POLL_MS);
}
