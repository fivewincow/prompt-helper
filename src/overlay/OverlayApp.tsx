import { FillView } from "./FillView";
import { PaletteView } from "./PaletteView";
import { useOverlayStore } from "./overlayStore";

/** Root of the always-on overlay window: the fill window or the search palette. */
export function OverlayApp() {
  const { view, paletteSeq } = useOverlayStore();
  if (view === "fill") return <FillView />;
  if (view === "palette") return <PaletteView key={paletteSeq} />;
  return null;
}
