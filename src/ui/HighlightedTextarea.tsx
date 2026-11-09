import { forwardRef, useRef, type KeyboardEvent, type ReactNode } from "react";
import { closingLines } from "../core/guideLookup";
import { findPlaceholders, type Range } from "../core/placeholders";
import "./highlighted.css";

interface Props {
  value: string;
  /** Absolute positions of blanks to highlight; when omitted, every `{...}` is highlighted. */
  blanks?: Range[];
  onChange: (text: string, selection: Range) => void;
  onSelect?: (selection: Range) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
}

/** Colors one line: "## " headings, the closing sentence, blanks, and plain text. */
function renderLine(line: string, marks: Range[], key: number, closing: boolean): ReactNode {
  if (line.startsWith("## ")) return <span key={key} className="hl-heading">{line}</span>;
  const parts: ReactNode[] = [];
  let at = 0;
  for (const r of marks) {
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
  { value, blanks, onChange, onSelect, onKeyDown, autoFocus },
  ref,
) {
  const backdrop = useRef<HTMLDivElement>(null);
  const lines = value.split("\n");
  const closing = closingLines(value);
  // Blank ranges per line, relative to the line start.
  const lineStarts: number[] = [];
  lines.reduce((offset, line) => (lineStarts.push(offset), offset + line.length + 1), 0);
  const marksFor = (line: string, i: number): Range[] =>
    blanks
      ? blanks
          .filter((r) => r.start >= lineStarts[i] && r.end <= lineStarts[i] + line.length)
          .map((r) => ({ start: r.start - lineStarts[i], end: r.end - lineStarts[i] }))
      : findPlaceholders(line);
  return (
    <div className="hl-root">
      <div className="hl-backdrop" ref={backdrop} aria-hidden>
        {lines.map((line, i) => (
          <span key={i}>
            {renderLine(line, marksFor(line, i), i, closing.has(i))}
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
