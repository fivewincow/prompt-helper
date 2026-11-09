import { useEffect, useMemo, useState } from "react";
import { formatAccelerator } from "../core/hotkeys";
import { MODE_INFO } from "../core/modes";
import { paletteKey, setQuery, type PaletteState } from "../core/paletteState";
import { flatten, search } from "../core/search";
import { toKeyInput } from "./FillView";
import { overlayStore, useOverlayStore } from "./overlayStore";
import { SearchList } from "./SearchList";
import "./overlay.css";

/** The search palette (mockup A): templates and phrases in one list. */
export function PaletteView() {
  const { data, platform } = useOverlayStore();
  // OverlayApp remounts this view on every opening (key = paletteSeq), so the query starts empty.
  const [ps, setPs] = useState<PaletteState>({ query: "", active: 0 });

  // Clicking anywhere else closes the palette (the fill window deliberately stays open).
  useEffect(() => {
    const onBlur = () => overlayStore.paletteEvent({ type: "close", reason: "blur" });
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  const groups = useMemo(() => (data ? search(ps.query, data, data.settings.mode) : []), [data, ps.query]);
  const items = flatten(groups);
  if (!data) return null;

  const choose = (index: number) => {
    const item = items[index];
    if (item) overlayStore.paletteEvent({ type: "choose", ref: item.ref });
  };
  const paletteKeyLabel = data.settings.bindings.palette
    ? `${formatAccelerator(data.settings.bindings.palette, platform)}로 열기 · `
    : "";

  return (
    <div className="palette">
      <div className="palette-search">
        <input
          autoFocus
          className="palette-input"
          placeholder="템플릿·문구 검색"
          value={ps.query}
          onChange={(e) => setPs((s) => setQuery(s, e.target.value))}
          onKeyDown={(e) => {
            const r = paletteKey(ps, toKeyInput(e), items.length);
            if (r.state !== ps) setPs(r.state);
            if (r.effect.type !== "none" || e.key === "ArrowDown" || e.key === "ArrowUp") e.preventDefault();
            if (r.effect.type === "choose") choose(r.effect.index);
            if (r.effect.type === "close") overlayStore.paletteEvent({ type: "close", reason: "escape" });
          }}
        />
        <span className="palette-mode">{MODE_INFO[data.settings.mode].label} 모드</span>
      </div>
      <SearchList
        groups={groups}
        active={ps.active}
        platform={platform}
        bindings={data.settings.bindings}
        onHover={(i) => setPs((s) => ({ ...s, active: i }))}
        onChoose={choose}
      />
      <footer className="palette-hints">{paletteKeyLabel}↑↓ 이동 · Enter 넣기 · Esc 닫기</footer>
    </div>
  );
}
