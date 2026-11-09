import { describe, expect, test } from "vitest";
import { findPlaceholders, nextPlaceholder, placeholderSet } from "./placeholders";
import { DEFAULT_TEMPLATES } from "./defaults/templates";
import { MODES } from "./modes";

const t = "## 목표\n{무엇을} — 이유: {왜}\n- 포함: {}\n날짜 {{today}}";
const slices = (text: string, only?: ReadonlySet<string>) =>
  findPlaceholders(text, only).map((r) => text.slice(r.start, r.end));

describe("findPlaceholders", () => {
  test("finds single-brace blanks, including empty ones, but not {{variables}}", () => {
    expect(slices(t)).toEqual(["{무엇을}", "{왜}", "{}"]);
  });

  test("does not span lines", () => {
    expect(findPlaceholders("{a\nb}")).toEqual([]);
  });

  test("with a known set, ignores braces pasted in later (JSON, logs)", () => {
    const known = placeholderSet(t);
    const edited = t.replace("{왜}", '로그 {"code":401}');
    expect(slices(edited, known)).toEqual(["{무엇을}", "{}"]);
  });

  test("never reports part of a {{variable}} in any default template", () => {
    for (const tpl of DEFAULT_TEMPLATES)
      for (const m of MODES) for (const s of slices(tpl.bodies[m])) expect(s).not.toContain("{{");
  });
});

describe("nextPlaceholder", () => {
  const all = findPlaceholders(t);

  test("moves forward from the end of the current blank", () => {
    expect(nextPlaceholder(t, all[0].end, 1)).toEqual(all[1]);
  });

  test("wraps forward past the last blank", () => {
    expect(nextPlaceholder(t, t.length, 1)).toEqual(all[0]);
  });

  test("wraps backward before the first blank", () => {
    expect(nextPlaceholder(t, all[0].start, -1)).toEqual(all[2]);
  });

  test("returns null when there are no blanks", () => {
    expect(nextPlaceholder("빈칸 없음", 0, 1)).toBeNull();
  });
});
