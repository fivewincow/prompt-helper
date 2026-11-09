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
