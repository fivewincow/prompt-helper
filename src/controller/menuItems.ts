/** Turns the platform-neutral menu model into options for Tauri's native menu API. */
import type {
  CheckMenuItemOptions,
  MenuItemOptions,
  PredefinedMenuItemOptions,
  SubmenuOptions,
} from "@tauri-apps/api/menu";
import type { MenuNode } from "../core/menuModel";

export type ItemOptions = MenuItemOptions | CheckMenuItemOptions | SubmenuOptions | PredefinedMenuItemOptions;

function toOptions(node: MenuNode, build: string, onItem: (id: string) => void, withShortcuts: boolean): ItemOptions {
  switch (node.type) {
    case "separator":
      return { item: "Separator" };
    case "label":
      return { text: node.text, enabled: false };
    case "submenu":
      return { text: node.text, items: node.items.map((n) => toOptions(n, build, onItem, withShortcuts)) };
    case "item": {
      const base: MenuItemOptions = {
        id: `${node.id}#${build}`,
        text: node.text,
        accelerator: withShortcuts ? node.shortcut : undefined,
        action: () => onItem(node.id),
      };
      return node.checked === undefined ? base : { ...base, checked: node.checked };
    }
  }
}

/**
 * `build` must differ on every call (including across page reloads). Tauri keeps one click
 * handler per native item id and drops it when an item with that id is freed, so the menu a
 * rebuild replaces would otherwise take the new menu's handlers with it.
 */
export function toMenuOptions(
  model: MenuNode[],
  build: string,
  onItem: (id: string) => void,
  withShortcuts: boolean,
): ItemOptions[] {
  return model.map((n) => toOptions(n, build, onItem, withShortcuts));
}
