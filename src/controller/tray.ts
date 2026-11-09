/** Renders the menu model as the menu bar (macOS) / tray (Windows) icon and its menu. */
import { defaultWindowIcon } from "@tauri-apps/api/app";
import {
  Menu,
  type CheckMenuItemOptions,
  type MenuItemOptions,
  type PredefinedMenuItemOptions,
  type SubmenuOptions,
} from "@tauri-apps/api/menu";
import { TrayIcon } from "@tauri-apps/api/tray";
import { buildMenuModel, trayTitle, type MenuNode } from "../core/menuModel";
import { MODE_INFO } from "../core/modes";
import type { AppData, Platform } from "../core/types";

const TRAY_ID = "main";
let currentMenu: Menu | null = null;

type ItemOptions = MenuItemOptions | CheckMenuItemOptions | SubmenuOptions | PredefinedMenuItemOptions;

function toOptions(node: MenuNode, onItem: (id: string) => void): ItemOptions {
  switch (node.type) {
    case "separator":
      return { item: "Separator" };
    case "label":
      return { text: node.text, enabled: false };
    case "submenu":
      return { text: node.text, items: node.items.map((n) => toOptions(n, onItem)) };
    case "item": {
      const base: MenuItemOptions = { id: node.id, text: node.text, accelerator: node.shortcut, action: onItem };
      return node.checked === undefined ? base : { ...base, checked: node.checked };
    }
  }
}

/** Creates the tray icon on first call and updates it afterwards (no duplicates on reload). */
export async function syncTray(
  data: AppData,
  platform: Platform,
  accessibilityOk: boolean,
  onItem: (id: string) => void,
): Promise<void> {
  const menu = await Menu.new({ items: buildMenuModel(data, platform, accessibilityOk).map((n) => toOptions(n, onItem)) });
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
