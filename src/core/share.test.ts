import { describe, expect, test } from "vitest";
import { mergeWithDefaults } from "./data";
import { addPhrase, createTemplate, setTemplateBody, setTemplateName, updatePhrase } from "./editing";
import {
  SHARE_FORMAT,
  SHARE_MAX_BYTES,
  SHARE_VERSION,
  applyImport,
  buildBundle,
  defaultPicks,
  parseBundle,
  planImport,
  type ShareBundle,
} from "./share";

const base = mergeWithDefaults(null);
// One custom template, one edited built-in, one new phrase.
const withMine = (() => {
  let d = createTemplate(base, "t-mine");
  d = setTemplateName(d, "t-mine", "코드 점검");
  d = setTemplateBody(d, "t-mine", "claude", "## 대상\n{점검할 범위}");
  d = setTemplateBody(d, "feature", "claude", "edited feature body");
  d = addPhrase(d, "p-mine", "범위");
  d = updatePhrase(d, "p-mine", { text: "테스트 파일은 건드리지 마", recommendedModes: ["claude"] });
  return d;
})();

const ids = (n: number) => {
  let i = 0;
  return () => `new-${++i}-of-${n}`;
};

describe("buildBundle", () => {
  test("exports picked templates and phrases without ids, hotkeys or order", () => {
    const b = buildBundle(withMine, ["t-mine"], ["p-mine"], "2026-11-10");
    expect(b).toEqual({
      format: SHARE_FORMAT,
      version: SHARE_VERSION,
      exportedAt: "2026-11-10",
      templates: [{ name: "코드 점검", bodies: { claude: "## 대상\n{점검할 범위}", codex: "", gemini: "" } }],
      phrases: [{ category: "범위", text: "테스트 파일은 건드리지 마", recommendedModes: ["claude"] }],
    });
  });

  test("keeps the app's order, not the order things were picked in", () => {
    const b = buildBundle(withMine, ["t-mine", "feature"], [], "2026-11-10");
    expect(b.templates.map((t) => t.name)).toEqual(["기능 개발", "코드 점검"]);
  });
});

describe("defaultPicks", () => {
  test("picks what the user made or changed, not untouched defaults", () => {
    const p = defaultPicks(withMine);
    expect(p.templateIds).toEqual(expect.arrayContaining(["t-mine", "feature"]));
    expect(p.templateIds).not.toContain("plan-doc");
    expect(p.phraseIds).toEqual(["p-mine"]);
  });
});

describe("parseBundle", () => {
  const bundle = buildBundle(withMine, ["t-mine"], ["p-mine"], "2026-11-10");

  test("reads back what buildBundle wrote", () => {
    expect(parseBundle(JSON.stringify(bundle, null, 2))).toEqual({ ok: true, bundle, dropped: 0 });
  });

  test("rejects text that is not JSON", () => {
    expect(parseBundle("## 목표")).toEqual({ ok: false, error: "JSON 파일이 아니에요." });
  });

  test("rejects JSON from something else", () => {
    expect(parseBundle('{"templates": []}')).toEqual({ ok: false, error: "Prompt Helper 템플릿 파일이 아니에요." });
  });

  test("rejects a file from a newer app version", () => {
    const newer = JSON.stringify({ ...bundle, version: SHARE_VERSION + 1 });
    expect(parseBundle(newer)).toEqual({
      ok: false,
      error: "더 새 버전의 Prompt Helper에서 만든 파일이에요. 앱을 업데이트한 뒤 가져와 주세요.",
    });
  });

  test("rejects a file over the size limit", () => {
    const big = JSON.stringify({ ...bundle, exportedAt: "x".repeat(SHARE_MAX_BYTES) });
    expect(parseBundle(big)).toEqual({ ok: false, error: "파일이 너무 커요. 1MB 이하 파일만 가져올 수 있어요." });
  });

  test("drops broken items, counts them, and fills missing mode bodies", () => {
    const messy = JSON.stringify({
      format: SHARE_FORMAT,
      version: 1,
      exportedAt: "2026-11-10",
      templates: [{ name: "  " }, { name: "부분", bodies: { claude: "c" } }, "nope"],
      phrases: [
        { category: "없는 갈래", text: "x" },
        { category: "출력", text: "" },
        { category: "출력", text: "표로 정리해줘", recommendedModes: ["nope"] },
      ],
    });
    const r = parseBundle(messy);
    expect(r).toEqual({
      ok: true,
      dropped: 4,
      bundle: {
        format: SHARE_FORMAT,
        version: 1,
        exportedAt: "2026-11-10",
        templates: [{ name: "부분", bodies: { claude: "c", codex: "", gemini: "" } }],
        phrases: [{ category: "출력", text: "표로 정리해줘", recommendedModes: "all" }],
      },
    });
  });
});

describe("planImport", () => {
  const incoming: ShareBundle = {
    format: SHARE_FORMAT,
    version: 1,
    exportedAt: "2026-11-10",
    templates: [
      { name: "코드 점검", bodies: { claude: "a", codex: "", gemini: "" } },
      { name: "코드 점검", bodies: { claude: "b", codex: "", gemini: "" } },
      { name: "기능 개발", bodies: { claude: "c", codex: "", gemini: "" } },
      { name: "새 것", bodies: { claude: "d", codex: "", gemini: "" } },
    ],
    phrases: [
      { category: "범위", text: " 테스트 파일은 건드리지 마 ", recommendedModes: "all" },
      { category: "출력", text: "표로 정리해줘", recommendedModes: "all" },
    ],
  };

  test("a taken name becomes a copy name, including names taken in the same import", () => {
    const p = planImport(withMine, incoming, { templates: [0, 1, 2, 3], phrases: [] });
    expect(p.templates.map((t) => t.finalName)).toEqual(["코드 점검 (2)", "코드 점검 (3)", "기능 개발 (2)", "새 것"]);
  });

  test("only picked templates take names", () => {
    const p = planImport(withMine, incoming, { templates: [1], phrases: [] });
    expect(p.templates).toEqual([{ index: 1, finalName: "코드 점검 (2)" }]);
  });

  test("a phrase the user already has is marked as a duplicate", () => {
    const p = planImport(withMine, incoming, { templates: [], phrases: [0, 1] });
    expect(p.phrases).toEqual([
      { index: 0, duplicate: true },
      { index: 1, duplicate: false },
    ]);
  });
});

describe("applyImport", () => {
  const incoming: ShareBundle = {
    format: SHARE_FORMAT,
    version: 1,
    exportedAt: "2026-11-10",
    templates: [{ name: "코드 점검", bodies: { claude: "imported", codex: "x", gemini: "" } }],
    phrases: [
      { category: "출력", text: "표로 정리해줘", recommendedModes: ["codex"] },
      { category: "범위", text: "테스트 파일은 건드리지 마", recommendedModes: "all" },
    ],
  };
  const { data, report } = applyImport(withMine, incoming, { templates: [0], phrases: [0, 1] }, ids(3));

  test("adds templates as new custom templates and leaves existing ones alone", () => {
    const added = data.templates.find((t) => t.id === "new-1-of-3")!;
    expect(added).toMatchObject({ name: "코드 점검 (2)", builtIn: false, hidden: false });
    expect(added.bodies).toEqual({ claude: "imported", codex: "x", gemini: "" });
    expect(data.templates.find((t) => t.id === "t-mine")).toEqual(withMine.templates.find((t) => t.id === "t-mine"));
  });

  test("adds new phrases at the end of their category and skips ones already there", () => {
    const added = data.phrases.find((p) => p.text === "표로 정리해줘")!;
    expect(added).toMatchObject({ category: "출력", recommendedModes: ["codex"] });
    const output = [...data.phrases].filter((p) => p.category === "출력").sort((a, b) => a.order - b.order);
    expect(output[output.length - 1].text).toBe("표로 정리해줘");
    expect(data.phrases.filter((p) => p.text === "테스트 파일은 건드리지 마")).toHaveLength(1);
  });

  test("reports what happened and never touches hotkeys", () => {
    expect(report).toEqual({ templates: 1, phrases: 1, skippedPhrases: 1, renamed: 1 });
    expect(data.settings.bindings).toEqual(withMine.settings.bindings);
  });
});
