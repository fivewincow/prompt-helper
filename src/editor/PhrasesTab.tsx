import { addPhrase, deletePhrase, movePhrase, newId, updatePhrase } from "../core/editing";
import { MODES, MODE_INFO } from "../core/modes";
import { PHRASE_CATEGORIES, type AppData, type Mode, type Phrase } from "../core/types";

interface Props {
  data: AppData;
  onChange: (next: AppData) => void;
}

/** Recommended modes as checkboxes; none checked means "all modes". */
function toggleMode(p: Phrase, m: Mode): Phrase["recommendedModes"] {
  const current = p.recommendedModes === "all" ? [] : p.recommendedModes;
  const next = current.includes(m) ? current.filter((x) => x !== m) : [...current, m];
  return next.length === 0 ? "all" : next;
}

export function PhrasesTab({ data, onChange }: Props) {
  const sorted = [...data.phrases].sort((a, b) => a.order - b.order);

  /** Moves a phrase past its neighbour in the same category (the list is shown per category). */
  const move = (p: Phrase, dir: -1 | 1) => {
    const same = sorted.filter((x) => x.category === p.category);
    const neighbour = same[same.indexOf(p) + dir];
    if (!neighbour) return;
    onChange(movePhrase(data, p.id, sorted.indexOf(neighbour)));
  };

  return (
    <div className="phrases">
      <p className="note">
        검색 팝업(⌘K 포함)과 메뉴바에서 고르면 커서 위치에 들어가는 문장이에요. <code>{"{{rulesFile}}"}</code>은 모드에
        맞는 규칙 파일 이름으로 바뀌고, <code>{"{빈칸}"}</code>은 채우기 창에서 Tab으로 이동할 수 있어요.
      </p>
      {PHRASE_CATEGORIES.map((category) => {
        const items = sorted.filter((p) => p.category === category);
        return (
          <section key={category} className="phrase-group">
            <h3>{category}</h3>
            {items.map((p, i) => (
              <div key={p.id} className="phrase-row">
                <input
                  className="phrase-text"
                  value={p.text}
                  placeholder="문구를 입력하세요"
                  onChange={(e) => onChange(updatePhrase(data, p.id, { text: e.target.value }))}
                />
                <select
                  value={p.category}
                  onChange={(e) =>
                    onChange(updatePhrase(data, p.id, { category: e.target.value as Phrase["category"] }))
                  }
                >
                  {PHRASE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="rec" title="체크한 모드에서 목록 위쪽에 '추천'으로 보여요. 없으면 전체">
                  추천
                  {MODES.map((m) => (
                    <label key={m}>
                      <input
                        type="checkbox"
                        checked={p.recommendedModes !== "all" && p.recommendedModes.includes(m)}
                        onChange={() => onChange(updatePhrase(data, p.id, { recommendedModes: toggleMode(p, m) }))}
                      />
                      {MODE_INFO[m].short}
                    </label>
                  ))}
                </span>
                <span className="order">
                  <button type="button" title="위로" disabled={i === 0} onClick={() => move(p, -1)}>
                    ▲
                  </button>
                  <button type="button" title="아래로" disabled={i === items.length - 1} onClick={() => move(p, 1)}>
                    ▼
                  </button>
                </span>
                <button type="button" className="btn danger" onClick={() => onChange(deletePhrase(data, p.id))}>
                  삭제
                </button>
              </div>
            ))}
            <button type="button" className="link" onClick={() => onChange(addPhrase(data, newId("p"), category))}>
              + 문구 추가
            </button>
          </section>
        );
      })}
    </div>
  );
}
