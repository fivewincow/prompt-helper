import { beforeEach, expect, test, vi } from "vitest";
import { loadAppData, saveAppData } from "./store";
import { backupData, loadData, saveData } from "./commands";
import { emitDataChanged } from "./events";
import { mergeWithDefaults, toStored } from "../core/data";

vi.mock("./commands", () => ({ loadData: vi.fn(), saveData: vi.fn(), backupData: vi.fn() }));
vi.mock("./events", () => ({ emitDataChanged: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

test("a broken data file is backed up and the app starts from defaults", async () => {
  vi.mocked(loadData).mockResolvedValue("{broken");
  const r = await loadAppData();
  expect(backupData).toHaveBeenCalledOnce();
  expect(r.recovered).toBe(true);
  expect(r.data).toEqual(mergeWithDefaults(null));
});

test("no data file yet is a normal first run, not a recovery", async () => {
  vi.mocked(loadData).mockResolvedValue(null);
  const r = await loadAppData();
  expect(r.recovered).toBe(false);
  expect(r.firstRun).toBe(true);
  expect(backupData).not.toHaveBeenCalled();
});

test("a valid file is merged with the defaults", async () => {
  const data = mergeWithDefaults(null);
  data.settings.mode = "gemini";
  vi.mocked(loadData).mockResolvedValue(JSON.stringify(toStored(data)));
  const r = await loadAppData();
  expect(r.data.settings.mode).toBe("gemini");
  expect(r.firstRun).toBe(false);
});

test("saving writes the stored form and announces who changed it", async () => {
  const data = mergeWithDefaults(null);
  await saveAppData(data, "editor");
  expect(saveData).toHaveBeenCalledWith(JSON.stringify(toStored(data), null, 2));
  expect(emitDataChanged).toHaveBeenCalledWith({ source: "editor" });
});
