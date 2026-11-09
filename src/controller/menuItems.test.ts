import { describe, expect, it } from "vitest";
import type { MenuNode } from "../core/menuModel";
import { toMenuOptions, type ItemOptions } from "./menuItems";

const model: MenuNode[] = [
  { type: "item", id: "mode:claude", text: "Claude Code", checked: true },
  { type: "separator" },
  {
    type: "submenu",
    text: "템플릿",
    items: [{ type: "item", id: "template:feature", text: "기능 개발", shortcut: "Control+Alt+Digit2" }],
  },
  { type: "item", id: "quit", text: "종료" },
];

/** Every clickable item, submenus included. */
function clickable(options: ItemOptions[]): { id: string; action: (id: string) => void }[] {
  return options.flatMap((o) => {
    if ("items" in o && Array.isArray(o.items)) return clickable(o.items as ItemOptions[]);
    if ("id" in o && "action" in o && o.id && o.action) return [{ id: o.id, action: o.action }];
    return [];
  });
}

describe("toMenuOptions", () => {
  it("gives each build its own native item ids", () => {
    // Closing the menu a rebuild replaced drops its items, and Tauri drops each item's click
    // handler by id. Shared ids would take the new menu's handlers with them: every click dead.
    const first = clickable(toMenuOptions(model, "a", () => {}, true)).map((i) => i.id);
    const second = clickable(toMenuOptions(model, "b", () => {}, true)).map((i) => i.id);
    expect(first).toHaveLength(3);
    expect(first.filter((id) => second.includes(id))).toEqual([]);
  });

  it("reports the model id when an item is clicked", () => {
    const clicked: string[] = [];
    for (const item of clickable(toMenuOptions(model, "a", (id) => clicked.push(id), true))) item.action(item.id);
    expect(clicked).toEqual(["mode:claude", "template:feature", "quit"]);
  });
});
