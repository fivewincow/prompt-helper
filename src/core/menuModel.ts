import { formatAccelerator } from "./hotkeys";
import { MODES, MODE_INFO } from "./modes";
import { PHRASE_CATEGORIES, type ActionId, type AppData, type Mode, type Platform } from "./types";

/**
 * A platform-neutral menu description; controller/tray.ts turns it into a real tray menu.
 * `accelerator` is the display form (⌃⌥2); `shortcut` is the canonical form the native menu parses.
 */
export type MenuNode =
  | { type: "item"; id: string; text: string; accelerator?: string; shortcut?: string; checked?: boolean }
  | { type: "submenu"; text: string; items: MenuNode[] }
  | { type: "label"; text: string }
  | { type: "separator" };

export function trayTitle(mode: Mode): "CC" | "CX" | "GM" {
  return MODE_INFO[mode].short;
}

export function buildMenuModel(data: AppData, platform: Platform, accessibilityOk: boolean): MenuNode[] {
  const { settings } = data;

  const modes: MenuNode[] = MODES.map((m) => ({
    type: "item",
    id: `mode:${m}`,
    text: MODE_INFO[m].label,
    checked: settings.mode === m,
  }));

  const templates: MenuNode[] = data.templates
    .filter((t) => !t.hidden)
    .sort((a, b) => a.order - b.order)
    .map((t) => {
      const acc = settings.bindings[`template:${t.id}` as ActionId];
      return {
        type: "item",
        id: `template:${t.id}`,
        text: t.name,
        accelerator: acc ? formatAccelerator(acc, platform) : undefined,
        shortcut: acc ?? undefined,
      };
    });

  const phrases: MenuNode[] = PHRASE_CATEGORIES.flatMap((category): MenuNode[] => {
    const items = data.phrases
      .filter((p) => p.category === category)
      .sort((a, b) => a.order - b.order)
      .map((p): MenuNode => ({ type: "item", id: `phrase:${p.id}`, text: p.text }));
    return items.length > 0 ? [{ type: "label", text: category }, ...items] : [];
  });

  return [
    { type: "label", text: "모드" },
    ...modes,
    { type: "separator" },
    { type: "submenu", text: "템플릿", items: templates },
    { type: "submenu", text: "문구", items: phrases },
    { type: "separator" },
    ...(platform === "mac" && !accessibilityOk
      ? [{ type: "item", id: "open-accessibility", text: "손쉬운 사용 권한 켜기…" } as const]
      : []),
    { type: "item", id: "open-editor", text: "템플릿 편집…" },
    { type: "item", id: "open-settings", text: "설정…" },
    { type: "separator" },
    { type: "item", id: "quit", text: "종료" },
  ];
}
