/** Renders the menu model as the menu bar (macOS) / tray (Windows) icon and its menu. */
import { defaultWindowIcon } from "@tauri-apps/api/app";
import { Menu } from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { buildMenuModel, trayTitle } from "../core/menuModel";
import { MODE_INFO } from "../core/modes";
import type { AppData, Platform } from "../core/types";
import { toMenuOptions } from "./menuItems";

const TRAY_ID = "main";
let currentMenu: Menu | null = null;
// Native item ids must never repeat, not even after the page reloads (see toMenuOptions).
const SESSION = Date.now().toString(36);
let builds = 0;

/** Creates the tray icon on first call and updates it afterwards (no duplicates on reload). */
export async function syncTray(
  data: AppData,
  platform: Platform,
  accessibilityOk: boolean,
  drafted: ReadonlySet<string>,
  onItem: (id: string) => void,
): Promise<void> {
  const model = buildMenuModel(data, platform, accessibilityOk, drafted);
  const build = (withShortcuts: boolean) =>
    Menu.new({ items: toMenuOptions(model, `${SESSION}.${++builds}`, onItem, withShortcuts) });
  // A hotkey the native menu cannot parse must not cost the user the whole menu.
  const menu = await build(true).catch(() => build(false));
  const tooltip = `Prompt Helper · ${MODE_INFO[data.settings.mode].label}`;
  // macOS shows just the mode letters in the menu bar; Windows has no tray titles, so it gets the icon.
  const title = platform === "mac" ? trayTitle(data.settings.mode) : null;

  const existing = await TrayIcon.getById(TRAY_ID);
  if (existing) {
    await existing.setMenu(menu);
    await existing.setTitle(title);
    await existing.setTooltip(tooltip);
  } else {
    await TrayIcon.new({
      id: TRAY_ID,
      menu,
      tooltip,
      title: title ?? undefined,
      icon: platform === "windows" ? ((await defaultWindowIcon()) ?? undefined) : undefined,
      showMenuOnLeftClick: true,
    });
  }
  // Free the native resources of the menu we just replaced.
  await currentMenu?.close();
  currentMenu = menu;
}
