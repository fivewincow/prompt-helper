import type { Mode } from "./types";

export const MODES: readonly Mode[] = ["claude", "codex", "gemini"];

export const MODE_INFO: Record<Mode, { label: string; short: "CC" | "CX" | "GM"; rulesFile: string }> = {
  claude: { label: "Claude Code", short: "CC", rulesFile: "CLAUDE.md" },
  codex: { label: "Codex", short: "CX", rulesFile: "AGENTS.md" },
  gemini: { label: "Gemini", short: "GM", rulesFile: "GEMINI.md" },
};

export function nextMode(m: Mode): Mode {
  return MODES[(MODES.indexOf(m) + 1) % MODES.length];
}
