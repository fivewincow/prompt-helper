import { expect, test } from "vitest";
import capabilities from "../src-tauri/capabilities/default.json";

// Each front-end API below is silently refused at runtime when its permission is missing.
const REQUIRED = [
  // getCurrentWindow().onCloseRequested() closes the window by calling destroy().
  "core:window:allow-destroy",
  // openUrl() in the guide panel: allow-open-url alone has no URL scope.
  "opener:allow-default-urls",
  // defaultWindowIcon() for the Windows tray icon.
  "core:app:allow-default-window-icon",
];

test("capabilities grant every permission the front end relies on", () => {
  for (const p of REQUIRED) expect(capabilities.permissions).toContain(p);
});
