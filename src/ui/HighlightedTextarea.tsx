import { forwardRef, useRef, type KeyboardEvent, type ReactNode } from "react";
import { closingLines } from "../core/guideLookup";
import { findPlaceholders, type Range } from "../core/placeholders";
import "./highlighted.css";

interface Props {
  value: string;
  /** Blanks to highlight; when omitted, every `{...}` is highlighted. */
  known?: ReadonlySet<string>;
  onChange: (text: string, selection: Range) => void;
  onSelect?: (selection: Range) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
}

/** Colors one line: "## " headings, the closing sentence, blanks, and plain text. */
function renderLine(line: string, known: ReadonlySet<string> | undefined, key: number, closing: boolean): ReactNode {
  if (line.startsWith("## ")) return <span key={key} className="hl-heading">{line}</span>;
  const parts: ReactNode[] = [];
  let at = 0;
  for (const r of findPlaceholders(line, known)) {
    if (r.start > at) parts.push(line.slice(at, r.start));
    parts.push(<mark key={r.start} className="hl-blank">{line.slice(r.start, r.end)}</mark>);
    at = r.end;
  }
  parts.push(line.slice(at));
  return <span key={key} className={closing ? "hl-closing" : undefined}>{parts}</span>;
}

/**
 * A textarea with syntax colors. The textarea's own text is transparent (caret and selection
 * stay visible) and an identical backdrop underneath draws the colored text. No editor package.
 */
export const HighlightedTextarea = forwardRef<HTMLTextAreaElement, Props>(function HighlightedTextarea(
  { value, known, onChange, onSelect, onKeyDown, autoFocus },
  ref,
) {
  const backdrop = useRef<HTMLDivElement>(null);
  const lines = value.split("\n");
  const closing = closingLines(value);
  return (
    <div className="hl-root">
      <div className="hl-backdrop" ref={backdrop} aria-hidden>
        {lines.map((line, i) => (
          <span key={i}>
            {renderLine(line, known, i, closing.has(i))}
            {"\n"}
          </span>
        ))}
      </div>
      <textarea
        ref={ref}
        className="hl-input"
        value={value}
        spellCheck={false}
        autoFocus={autoFocus}
        onChange={(e) =>
          onChange(e.target.value, { start: e.target.selectionStart, end: e.target.selectionEnd })
        }
        onSelect={(e) =>
          onSelect?.({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd })
        }
        onKeyDown={onKeyDown}
        onScroll={(e) => {
          if (backdrop.current) backdrop.current.scrollTop = e.currentTarget.scrollTop;
        }}
      />
    </div>
  );
});
