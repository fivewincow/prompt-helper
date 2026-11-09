import { GUIDE_ENTRIES, HEADING_TO_GUIDE } from "./defaults/guide";
import type { GuideEntry, GuideKey, Mode } from "./types";

const isHeading = (line: string) => line.startsWith("## ");
const isBlank = (line: string) => line.trim() === "";

/*
 * A block is a "## " heading line plus the lines after it up to the next blank line.
 * Text before the first heading is pasted material (e.g. <error_log>); text after the
 * last block is the recommended closing sentence, which is about how to proceed.
 */
export function guideKeyAt(text: string, cursor: number): GuideKey {
  const lines = text.split("\n");
  let idx = text.slice(0, cursor).split("\n").length - 1;
  while (idx >= 0 && isBlank(lines[idx])) idx--;
  if (idx < 0) return "general";

  for (let i = idx; i >= 0 && !isBlank(lines[i]); i--) {
    if (isHeading(lines[i])) return HEADING_TO_GUIDE[lines[i].slice(3).trim()] ?? "general";
  }

  const firstHeading = lines.findIndex(isHeading);
  if (firstHeading === -1 || idx < firstHeading) return "material";
  const headingAfter = lines.slice(idx + 1).some(isHeading);
  return headingAfter ? "general" : "process";
}

export function guideFor(key: GuideKey, mode: Mode): { entry: GuideEntry; tips: string[]; source: string } {
  const entry = GUIDE_ENTRIES[key];
  const tips = [entry.tips.all, entry.tips[mode]].filter((t): t is string => Boolean(t));
  const source = (mode === "claude" ? undefined : entry.sources[mode]) ?? entry.sources.claude;
  return { entry, tips, source };
}

/** Line indexes of the recommended closing sentence: non-blank lines after the last block. */
export function closingLines(text: string): Set<number> {
  const lines = text.split("\n");
  let lastHeading = -1;
  lines.forEach((l, i) => {
    if (isHeading(l)) lastHeading = i;
  });
  const out = new Set<number>();
  if (lastHeading === -1) return out;
  let i = lastHeading;
  while (i < lines.length && !isBlank(lines[i])) i++;
  for (; i < lines.length; i++) if (!isBlank(lines[i])) out.add(i);
  return out;
}
