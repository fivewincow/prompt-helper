import { PHRASE_CATEGORIES, type ActionId, type AppData, type ItemRef, type Mode, type Phrase, type Template } from "./types";

export interface SearchItem {
  ref: ItemRef;
  label: string;
  recommended: boolean;
  actionId?: ActionId;
}

export interface SearchGroup {
  title: string;
  items: SearchItem[];
}

const norm = (s: string) => s.normalize("NFC").toLowerCase();

function matches(label: string, tokens: string[]): boolean {
  const l = norm(label);
  return tokens.every((t) => l.includes(t));
}

const templateItem = (t: Template): SearchItem => ({
  ref: { kind: "template", id: t.id },
  label: t.name,
  recommended: false,
  actionId: `template:${t.id}`,
});

const phraseItem = (p: Phrase, mode: Mode): SearchItem => ({
  ref: { kind: "phrase", id: p.id },
  label: p.text,
  recommended: Array.isArray(p.recommendedModes) && p.recommendedModes.includes(mode),
});

/** Groups for the palette: recent (empty query only), templates, then phrases by category. */
export function search(query: string, data: AppData, mode: Mode): SearchGroup[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  const visibleTemplates = data.templates.filter((t) => !t.hidden);
  const groups: SearchGroup[] = [];

  if (tokens.length === 0) {
    const recent = data.settings.recent.flatMap((ref): SearchItem[] => {
      if (ref.kind === "template") {
        const t = visibleTemplates.find((x) => x.id === ref.id);
        return t ? [templateItem(t)] : [];
      }
      const p = data.phrases.find((x) => x.id === ref.id);
      return p ? [phraseItem(p, mode)] : [];
    });
    groups.push({ title: "최근", items: recent });
  }

  const templates = visibleTemplates
    .filter((t) => matches(t.name, tokens))
    .sort((a, b) => a.order - b.order)
    .map(templateItem);
  groups.push({ title: "템플릿", items: templates });

  for (const category of PHRASE_CATEGORIES) {
    const items = data.phrases
      .filter((p) => p.category === category && matches(p.text, tokens))
      .sort((a, b) => a.order - b.order)
      .map((p) => phraseItem(p, mode))
      // Stable sort: recommended first, otherwise keep the order above.
      .sort((a, b) => Number(b.recommended) - Number(a.recommended));
    groups.push({ title: `문구 · ${category}`, items });
  }

  return groups.filter((g) => g.items.length > 0);
}

export function flatten(groups: SearchGroup[]): SearchItem[] {
  return groups.flatMap((g) => g.items);
}

export function pushRecent(recent: readonly ItemRef[], ref: ItemRef, max = 5): ItemRef[] {
  const rest = recent.filter((r) => !(r.kind === ref.kind && r.id === ref.id));
  return [ref, ...rest].slice(0, max);
}
