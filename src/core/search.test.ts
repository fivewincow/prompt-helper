import { describe, expect, test } from "vitest";
import { flatten, pushRecent, search } from "./search";
import { mergeWithDefaults } from "./data";

const data = mergeWithDefaults(null);

describe("search", () => {
  test("empty query shows recent first, then all templates", () => {
    const withRecent = { ...data, settings: { ...data.settings, recent: [{ kind: "phrase", id: "p02" } as const] } };
    const groups = search("", withRecent, "claude");
    expect(groups[0].title).toBe("최근");
    expect(groups[0].items[0].ref).toEqual({ kind: "phrase", id: "p02" });
    expect(groups[1].title).toBe("템플릿");
    expect(groups[1].items).toHaveLength(5);
  });

  test("matches phrases by text and leaves out empty groups", () => {
    const labels = flatten(search("계획", data, "claude")).map((i) => i.label);
    expect(labels).toEqual(expect.arrayContaining(["코드 전에 계획을 먼저 보여줘", "계획만 세우고 멈춰줘"]));
    expect(search("계획", data, "claude").some((g) => g.title === "템플릿")).toBe(false);
  });

  test("every query token must match", () => {
    expect(flatten(search("테스트 보고", data, "claude")).map((i) => i.label)).toEqual([
      "{테스트 명령} 실행 후 명령과 결과를 보고해줘",
    ]);
  });

  test("puts the current mode's recommended phrases first and marks them", () => {
    const proc = search("", data, "codex").find((g) => g.title === "문구 · 진행 방식")!;
    expect(proc.items[0]).toMatchObject({ label: "확인 질문 없이 맥락에서 판단해서 끝까지 진행해줘", recommended: true });
  });

  test("leaves out hidden templates", () => {
    const hidden = { ...data, templates: data.templates.map((t) => (t.id === "test" ? { ...t, hidden: true } : t)) };
    expect(flatten(search("테스트", hidden, "claude")).some((i) => i.ref.kind === "template")).toBe(false);
  });

  test("template items carry their action id for the hotkey label", () => {
    const tpl = search("버그", data, "claude").find((g) => g.title === "템플릿")!;
    expect(tpl.items[0]).toMatchObject({ label: "버그 수정", actionId: "template:bugfix" });
  });
});

describe("pushRecent", () => {
  test("moves an existing item to the front instead of duplicating it", () => {
    expect(pushRecent([{ kind: "phrase", id: "a" }, { kind: "phrase", id: "b" }], { kind: "phrase", id: "b" })).toEqual([
      { kind: "phrase", id: "b" },
      { kind: "phrase", id: "a" },
    ]);
  });

  test("keeps at most five", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ kind: "phrase" as const, id: `x${i}` }));
    expect(pushRecent(five, { kind: "phrase", id: "n" })).toHaveLength(5);
  });
});

test("empty phrases (just added in the editor) are not listed", () => {
  const withEmpty = { ...data, phrases: [...data.phrases, { ...data.phrases[0], id: "p-empty", text: "  " }] };
  expect(flatten(search("", withEmpty, "claude")).some((i) => i.ref.id === "p-empty")).toBe(false);
});
