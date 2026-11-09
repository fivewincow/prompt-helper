import { mergeWithDefaults, parseStored, toStored } from "../core/data";
import type { AppData } from "../core/types";
import { backupData, loadData, saveData } from "./commands";
import { emitDataChanged, type DataSource } from "./events";

/**
 * Loads data.json and merges it with the defaults. An unreadable file is moved aside
 * (data.corrupt-<time>.json) and the app starts from defaults instead of failing.
 */
export async function loadAppData(): Promise<{ data: AppData; recovered: boolean }> {
  const raw = await loadData();
  if (raw === null) return { data: mergeWithDefaults(null), recovered: false };
  const parsed = parseStored(raw);
  if (parsed.ok) return { data: mergeWithDefaults(parsed.value), recovered: false };
  await backupData();
  return { data: mergeWithDefaults(null), recovered: true };
}

/** Saves only what differs from the defaults and tells the other windows who changed it. */
export async function saveAppData(data: AppData, source: DataSource): Promise<void> {
  await saveData(JSON.stringify(toStored(data), null, 2));
  await emitDataChanged({ source });
}
