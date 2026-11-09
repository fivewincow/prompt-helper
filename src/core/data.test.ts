import { describe, expect, test } from "vitest";
import {
  DEFAULTS,
  defaultSettings,
  mergeWithDefaults,
  parseStored,
  resetTemplate,
  toStored,
  type StoredData,
} from "./data";

const stored: StoredData = {
  schemaVersion: 1,
  settings: {},
  templateOverrides: { feature: { bodies: { claude: "MINE" } } },
  customTemplates: [],
  phrases: null,
};

describe("mergeWithDefaults", () => {
  test("no stored data gives the defaults", () => {
    const fresh = mergeWithDefaults(null);
    expect(fresh.templates).toHaveLength(5);
    expect(fresh.phrases).toHaveLength(17);
    expect(fresh.settings).toEqual(defaultSettings());
  });

  test("user edits survive a defaults update, untouched modes take the new defaults", () => {
    const newDefaults = {
      ...DEFAULTS,
      templates: DEFAULTS.templates.map((t) => (t.id === "feature" ? { ...t, bodies: { ...t.bodies, codex: "NEW" } } : t)),
    };
    const merged = mergeWithDefaults(stored, newDefaults).templates.find((t) => t.id === "feature")!;
    expect(merged.bodies.claude).toBe("MINE");
    expect(merged.bodies.codex).toBe("NEW");
  });

  test("drops overrides for built-ins that no longer exist", () => {
    expect(mergeWithDefaults({ ...stored, templateOverrides: { gone: { name: "x" } } }).templates).toHaveLength(5);
  });

  test("fills settings keys missing from older files", () => {
    expect(mergeWithDefaults({ ...stored, settings: { mode: "gemini" } }).settings.insertMode).toBe("fill");
  });
});

describe("toStored", () => {
  test("stores nothing but settings when data equals the defaults", () => {
    expect(toStored(mergeWithDefaults(null))).toEqual({
      schemaVersion: 1,
      settings: expect.any(Object),
      templateOverrides: {},
      customTemplates: [],
      phrases: null,
    });
  });

  test("round-trips through mergeWithDefaults", () => {
    const round = toStored(mergeWithDefaults(stored));
    expect(mergeWithDefaults(round)).toEqual(mergeWithDefaults(stored));
  });
});

test("resetTemplate restores the built-in exactly", () => {
  expect(resetTemplate(mergeWithDefaults(stored), "feature").templates.find((t) => t.id === "feature")).toEqual(
    DEFAULTS.templates[1],
  );
});

describe("parseStored", () => {
  test("rejects broken JSON", () => {
    expect(parseStored("{oops")).toEqual({ ok: false, reason: "invalid-json" });
  });

  test("rejects a newer schema version", () => {
    expect(parseStored('{"schemaVersion":2}')).toEqual({ ok: false, reason: "unsupported-version" });
  });

  test("rejects a file missing its top-level keys", () => {
    expect(parseStored('{"schemaVersion":1}')).toEqual({ ok: false, reason: "invalid-shape" });
  });

  test("accepts what toStored produces", () => {
    const raw = JSON.stringify(toStored(mergeWithDefaults(stored)));
    expect(parseStored(raw)).toEqual({ ok: true, value: JSON.parse(raw) });
  });
});

describe("hand-edited or damaged values (Review I6)", () => {
  const bad = (patch: Record<string, unknown>) => ({ ...stored, ...patch }) as unknown as StoredData;

  test("invalid settings fields fall back to defaults one by one", () => {
    const s = mergeWithDefaults(
      bad({
        settings: {
          mode: "bogus",
          insertMode: 3,
          launchAtLogin: "yes",
          bindings: { palette: 42, cycleMode: "Control+Alt+KeyN" },
          recent: [{ kind: "phrase", id: "p01" }, { kind: "nope" }, "x"],
        },
      }),
    ).settings;
    expect(s.mode).toBe("claude");
    expect(s.insertMode).toBe("fill");
    expect(s.launchAtLogin).toBe(true);
    expect(s.bindings.palette).toBe("Control+Alt+KeyP");
    expect(s.bindings.cycleMode).toBe("Control+Alt+KeyN");
    expect(s.recent).toEqual([{ kind: "phrase", id: "p01" }]);
  });

  test("bindings or recent of the wrong type are replaced", () => {
    const s = mergeWithDefaults(bad({ settings: { bindings: "x", recent: {} } })).settings;
    expect(s.bindings).toEqual(defaultSettings().bindings);
    expect(s.recent).toEqual([]);
  });

  test("bad override fields are ignored, good ones kept", () => {
    const t = mergeWithDefaults(
      bad({ templateOverrides: { feature: { name: 5, bodies: { claude: 7, codex: "OK" } } } }),
    ).templates.find((x) => x.id === "feature")!;
    expect(t.name).toBe("기능 개발");
    expect(t.bodies.claude).toBe(DEFAULTS.templates[1].bodies.claude);
    expect(t.bodies.codex).toBe("OK");
  });

  test("malformed custom templates and phrases are dropped", () => {
    const good = { id: "t-1", name: "내 것", builtIn: false, hidden: false, order: 9, bodies: { claude: "a", codex: "", gemini: "" } };
    const d = mergeWithDefaults(
      bad({
        customTemplates: [good, { id: "t-2", name: "깨짐" }],
        phrases: [{ id: "p01", text: "ok", category: "범위", recommendedModes: "all", order: 0 }, { id: "x", text: 1 }],
      }),
    );
    expect(d.templates.map((x) => x.id)).toContain("t-1");
    expect(d.templates.map((x) => x.id)).not.toContain("t-2");
    expect(d.phrases.map((p) => p.id)).toEqual(["p01"]);
  });
});

test("resetTemplate keeps the template where the user moved it (no duplicate order)", () => {
  const moved = { ...mergeWithDefaults(null) };
  moved.templates = [moved.templates[4], ...moved.templates.slice(0, 4)].map((t, i) => ({ ...t, order: i }));
  const reset = resetTemplate(moved, "research");
  expect(reset.templates.map((t) => t.id)[0]).toBe("research");
  expect(new Set(reset.templates.map((t) => t.order)).size).toBe(5);
});
