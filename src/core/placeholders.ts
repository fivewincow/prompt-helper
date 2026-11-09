/** A half-open text range [start, end); for blanks it includes the braces. */
export interface Range {
  start: number;
  end: number;
}

// A blank is `{...}` on one line with no braces inside; `{}` counts.
// The lookarounds keep `{{today}}`-style variables from matching.
const BLANK = /(?<!\{)\{[^{}\n]*\}(?!\})/g;

/**
 * Finds blanks in `text`. With `only`, keeps just the blanks whose exact text is in the set,
 * so braces the user pastes later (JSON, logs) are not mistaken for unfilled blanks.
 */
export function findPlaceholders(text: string, only?: ReadonlySet<string>): Range[] {
  const ranges: Range[] = [];
  for (const m of text.matchAll(BLANK)) {
    if (only && !only.has(m[0])) continue;
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  return ranges;
}

/** The set of blank strings present in `text`, used as the `only` filter later. */
export function placeholderSet(text: string): Set<string> {
  return new Set(findPlaceholders(text).map((r) => text.slice(r.start, r.end)));
}

/** Next (dir 1) or previous (dir -1) blank relative to `from`, wrapping around; null if none. */
export function nextPlaceholder(
  text: string,
  from: number,
  dir: 1 | -1,
  only?: ReadonlySet<string>,
): Range | null {
  const all = findPlaceholders(text, only);
  if (all.length === 0) return null;
  if (dir === 1) return all.find((r) => r.start >= from) ?? all[0];
  const before = all.filter((r) => r.end <= from);
  return before.length > 0 ? before[before.length - 1] : all[all.length - 1];
}
