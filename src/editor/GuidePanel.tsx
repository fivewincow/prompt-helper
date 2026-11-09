import { openUrl } from "@tauri-apps/plugin-opener";
import { guideFor, guideKeyAt } from "../core/guideLookup";
import type { Mode } from "../core/types";

/** Right-hand guide: tips for the section the cursor is in (mockup editor.html). */
export function GuidePanel({ text, cursor, mode }: { text: string; cursor: number; mode: Mode }) {
  const { entry, tips, source } = guideFor(guideKeyAt(text, cursor), mode);
  return (
    <aside className="guide">
      <h4>가이드 · {entry.title}</h4>
      <div className="guide-sec">왜 필요해요?</div>
      <p>{entry.why}</p>
      <div className="guide-sec">이렇게 써요</div>
      <p className="ok">✓ {entry.good}</p>
      <p className="no">✗ {entry.bad}</p>
      {tips.length > 0 && (
        <>
          <div className="guide-sec">팁</div>
          {tips.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </>
      )}
      <div className="guide-sec">출처</div>
      <button type="button" className="link" onClick={() => void openUrl(source)}>
        {source.replace(/^https:\/\//, "")}
      </button>
    </aside>
  );
}
