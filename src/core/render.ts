import { MODE_INFO } from "./modes";
import type { Mode, Template } from "./types";

/** Fills the app-provided variables. Single-brace `{blanks}` are left for the user. */
export function renderText(text: string, ctx: { today: string; mode: Mode }): string {
  return text.replaceAll("{{today}}", ctx.today).replaceAll("{{rulesFile}}", MODE_INFO[ctx.mode].rulesFile);
}

/** Picks the body for a mode, falling back to the Claude Code body when that mode's body is blank. */
export function resolveBody(t: Template, mode: Mode): { body: string; fellBack: boolean } {
  if (t.bodies[mode].trim() === "") return { body: t.bodies.claude, fellBack: mode !== "claude" };
  return { body: t.bodies[mode], fellBack: false };
}

/** Local date as YYYY-MM-DD. */
export function todayString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
