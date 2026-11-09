import { useEffect, useRef } from "react";
import { formatAccelerator } from "../core/hotkeys";
import type { SearchGroup } from "../core/search";
import type { Platform, Settings } from "../core/types";

interface Props {
  groups: SearchGroup[];
  active: number;
  platform: Platform;
  bindings?: Settings["bindings"];
  showGroupTitles?: boolean;
  onHover: (index: number) => void;
  onChoose: (index: number) => void;
}

/** Grouped result list shared by the palette and the fill window's phrase search. */
export function SearchList({ groups, active, platform, bindings, showGroupTitles = true, onHover, onChoose }: Props) {
  const activeRef = useRef<HTMLLIElement>(null);
  // Braces matter: newer engines return a Promise from scrollIntoView, and an effect must
  // return nothing or a cleanup function.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let index = -1;
  return (
    <ul className="search-list">
      {groups.map((g) => (
        <li key={g.title} className="search-group">
          {showGroupTitles && <div className="search-group-title">{g.title}</div>}
          <ul>
            {g.items.map((item) => {
              const i = ++index;
              const acc = item.actionId && bindings?.[item.actionId];
              return (
                <li
                  key={`${g.title}:${item.ref.kind}:${item.ref.id}`}
                  ref={i === active ? activeRef : undefined}
                  className={i === active ? "search-item active" : "search-item"}
                  onMouseEnter={() => onHover(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChoose(i);
                  }}
                >
                  <span className="search-label">{item.label}</span>
                  {item.recommended && <span className="badge">추천</span>}
                  {acc && <span className="kbd">{formatAccelerator(acc, platform)}</span>}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
      {index === -1 && <li className="search-empty">맞는 항목이 없어요</li>}
    </ul>
  );
}
