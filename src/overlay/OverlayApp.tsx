import { FillView } from "./FillView";
import { useOverlayStore } from "./overlayStore";

/** Root of the always-on overlay window: shows the fill window or (Task 14) the palette. */
export function OverlayApp() {
  const { view } = useOverlayStore();
  if (view === "fill") return <FillView />;
  return null;
}
