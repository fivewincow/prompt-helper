import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { planPhrase } from "../core/actions";
import { remainingBlanks, type KeyInput } from "../core/fillState";
import { isPrimaryMod } from "../core/hotkeys";
import { paletteKey, setQuery, type PaletteState } from "../core/paletteState";
import { todayString } from "../core/render";
import { flatten, search } from "../core/search";
import { HighlightedTextarea } from "../ui/HighlightedTextarea";
import { overlayStore, useOverlayStore } from "./overlayStore";
import { SearchList } from "./SearchList";
import "./overlay.css";

export function toKeyInput(e: KeyboardEvent): KeyInput {
  return {
    key: e.key,
    code: e.code,
    metaKey: e.metaKey,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    // keyCode 229 is how WebKit reports keys that belong to an IME composition.
    isComposing: e.nativeEvent.isComposing || e.keyCode === 229,
  };
}

/** ⌘K: a small phrase list inside the fill window. Chosen phrases go in at the caret. */
function PhraseSearch() {
  const { data, platform } = useOverlayStore();
  const [ps, setPs] = useState<PaletteState>({ query: "", active: 0 });
  const groups = useMemo(
    () => (data ? search(ps.query, data, data.settings.mode).filter((g) => g.title.startsWith("문구")) : []),
    [data, ps.query],
  );
  const items = flatten(groups);

  const choose = (index: number) => {
    const item = items[index];
    if (!item || !data) return;
    const plan = planPhrase(item.ref.id, data, todayString(new Date()));
    if (plan.kind === "paste") overlayStore.dispatchFill({ type: "insertPhrase", text: plan.text });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const input = toKeyInput(e);
    const r = paletteKey(ps, input, items.length);
    if (r.state !== ps) setPs(r.state);
    if (r.effect.type !== "none" || e.key === "ArrowDown" || e.key === "ArrowUp") e.preventDefault();
    if (r.effect.type === "choose") choose(r.effect.index);
    // Escape closes just the phrase search; the fill reducer handles that.
    if (r.effect.type === "close") overlayStore.dispatchFill({ type: "key", input });
  };

  return (
    <div className="phrase-search">
      <input
        autoFocus
        className="phrase-search-input"
        placeholder="문구 검색"
        value={ps.query}
        onChange={(e) => setPs((s) => setQuery(s, e.target.value))}
        onKeyDown={onKeyDown}
      />
      <SearchList
        groups={groups}
        active={ps.active}
        platform={platform}
        onHover={(i) => setPs((s) => ({ ...s, active: i }))}
        onChoose={choose}
      />
    </div>
  );
}

export function FillView() {
  const { fill, platform, selectSeq, selectRange } = useOverlayStore();
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Programmatic selection (first blank, Tab, inserted phrase) lands here.
  useEffect(() => {
    const ta = textarea.current;
    if (!ta || !selectRange) return;
    ta.focus();
    ta.setSelectionRange(selectRange.start, selectRange.end);
  }, [selectSeq, selectRange]);

  // Closing the phrase search unmounts its input, which drops focus on <body>; take it back
  // so the next key (Esc, ⌘Enter, typing) still reaches the text.
  const phraseSearch = fill?.phraseSearch ?? false;
  useEffect(() => {
    if (!phraseSearch) textarea.current?.focus();
  }, [phraseSearch]);

  if (!fill) return null;
  const mod = platform === "mac" ? "⌘" : "Ctrl+";

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const input = toKeyInput(e);
    if (input.isComposing) return;
    const primary = isPrimaryMod(input, platform);
    const handled =
      input.key === "Tab" ||
      input.key === "Escape" ||
      (primary && (input.key === "Enter" || input.code === "KeyK" || input.key.toLowerCase() === "k")) ||
      (fill.pendingReplace !== null && input.key === "Enter");
    if (!handled) return;
    e.preventDefault();
    overlayStore.dispatchFill({ type: "key", input });
  };

  return (
    <div className="fill">
      <header className="fill-title">{fill.title}</header>
      <HighlightedTextarea
        ref={textarea}
        value={fill.text}
        known={fill.known}
        autoFocus
        onChange={(text, selection) => overlayStore.dispatchFill({ type: "edit", text, selection })}
        onSelect={(selection) => overlayStore.dispatchFill({ type: "select", selection })}
        onKeyDown={onKeyDown}
      />
      {fill.phraseSearch && <PhraseSearch />}
      {fill.pendingReplace && (
        <p className="fill-notice">
          작성 중인 내용을 버리고 '{fill.pendingReplace.title}' 템플릿으로 바꿀까요? Enter 바꾸기 · Esc 계속 작성
        </p>
      )}
      {fill.confirmSubmit && !fill.pendingReplace && (
        <p className="fill-notice">
          빈칸 {remainingBlanks(fill)}개가 남았어요 · {mod}Enter를 한 번 더 누르면 그대로 붙여넣어요
        </p>
      )}
      <footer className="fill-hints">
        Tab 다음 빈칸 · {mod}Enter 붙여넣기 · {mod}K 문구 · Esc 취소
      </footer>
    </div>
  );
}
