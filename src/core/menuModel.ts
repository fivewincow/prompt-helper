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

/** `drafted`: templates with writing kept from an unfinished fill window. */
export function buildMenuModel(
  data: AppData,
  platform: Platform,
  accessibilityOk: boolean,
  drafted: ReadonlySet<string> = new Set(),
): MenuNode[] {
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
        // Native menus cannot color an item, so the draft is named in the text.
        text: drafted.has(t.id) ? `${t.name} · 임시저장` : t.name,
        accelerator: acc ? formatAccelerator(acc, platform) : undefined,
        shortcut: acc ?? undefined,
      };
    });

  const phrases: MenuNode[] = PHRASE_CATEGORIES.flatMap((category): MenuNode[] => {
    const items = data.phrases
      .filter((p) => p.category === category && p.text.trim() !== "")
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
