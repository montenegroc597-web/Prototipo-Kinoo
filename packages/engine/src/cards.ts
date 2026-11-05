import { ATOM_KEYS, type AtomDef, type CardDTO, type DeckDTO, type DeckRole, type Params, fitText, posterUrl } from '@kinoo/shared';
import type { IndexedMovie } from './catalog';
import type { ActiveDeck, DeckCard } from './deck';

/** Cómo se presentan los datos: país de las plataformas y desde dónde se sirven los pósters locales. */
export interface DtoOptions {
  country?: string;
  /** Base para pósters del repositorio ("posters/<id>.jpg"): por ejemplo "https://…/Prototipo-Kinoo/" o "../". */
  assetBaseUrl?: string;
  /** Estándar de caracteres de la carta (params card_*_max). */
  limits?: Partial<Params>;
  /** Etiquetas y nombres cortos de los átomos (para la frase y los temas del ADN). */
  atoms?: AtomDef[];
}

export const DEFAULT_CARD_LIMITS = {
  card_premise_max: 44,
  card_title_max: 24,
  card_subtitle_max: 40,
  card_overview_max: 110,
  card_explanation_max: 96,
  card_pillar_max: 15,
  card_dna_phrase_max: 44,
  card_dna_themes_max_chars: 30,
};

const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

/** "Una película de A y B"; si no cabe, solo el primer nombre (y "y otros" si cabe). */
/** ADN de la película: sus rasgos más distintivos, como frase y como temas cortos. */
function dna(m: IndexedMovie, atoms: AtomDef[] | undefined, phraseMax: number, themesMax: number) {
  const byKey = new Map((atoms ?? []).map((a) => [a.key, a]));
  const top = [...ATOM_KEYS].filter((k) => m.hat[k] > 0.05).sort((a, b) => m.hat[b] - m.hat[a]);
  const labels = top.slice(0, 2).map((k) => byKey.get(k)?.label ?? k);
  const phrase = labels.length === 2 ? `Historias ${labels[0]} y ${labels[1]}` : labels.length === 1 ? `Historias ${labels[0]}` : '';
  const themes: string[] = [];
  let used = 0;
  for (const k of top.slice(0, 3)) {
    const t = byKey.get(k)?.theme ?? byKey.get(k)?.label ?? k;
    if (used + t.length > themesMax) break;
    themes.push(t);
    used += t.length;
  }
  return { phrase: fitText(phrase, phraseMax), themes };
}

function byline(directors: string[], max: number): string {
  const all = `Una película de ${directors.join(' y ')}`;
  if (all.length <= max || directors.length === 0) return directors.length ? all : '';
  const first = `Una película de ${directors[0]}`;
  if (directors.length > 1 && first.length + 8 <= max) return `${first} y otros`;
  return fitText(first, max);
}

/** Las dos caras de la carta. El back entrega ambas; el front decide cuál mostrar primero. */
export function toCardDTO(
  m: IndexedMovie,
  card: { slot: number; role: DeckRole; explanation: string; special_treatment: boolean; curator_name?: string },
  o: DtoOptions = {},
): CardDTO {
  const mv = m.movie;
  const country = o.country ?? 'CO';
  const L = { ...DEFAULT_CARD_LIMITS, ...(o.limits ?? {}) } as typeof DEFAULT_CARD_LIMITS;
  const overview = mv.overview || sentenceCase(mv.hook);
  const d = dna(m, o.atoms, L.card_dna_phrase_max, L.card_dna_themes_max_chars);
  return {
    slot: card.slot,
    role: card.role,
    movie_id: mv.id,
    front: { hook: mv.hook, pillars: mv.pillars },
    back: {
      title: mv.title,
      year: mv.year,
      runtime_min: mv.runtime_min,
      genres: mv.genres,
      directors: mv.directors,
      poster_path: mv.poster_path ?? null,
      poster_url: posterUrl(mv.poster_path, { assetBaseUrl: o.assetBaseUrl }),
      overview: mv.overview ?? '',
      providers: mv.providers?.[country] ?? [],
    },
    explanation: card.explanation,
    display: {
      premise: fitText(sentenceCase(mv.hook), L.card_premise_max),
      title: fitText(mv.title, L.card_title_max),
      subtitle: byline(mv.directors, L.card_subtitle_max),
      overview: fitText(overview, L.card_overview_max),
      explanation: fitText(card.explanation, L.card_explanation_max),
      pillars: {
        ritmo: fitText(mv.pillars.ritmo, L.card_pillar_max),
        tono: fitText(mv.pillars.tono, L.card_pillar_max),
        historia: fitText(mv.pillars.historia, L.card_pillar_max),
        visual: fitText(mv.pillars.visual, L.card_pillar_max),
      },
      dna_phrase: d.phrase,
      themes: d.themes,
    },
    special_treatment: card.special_treatment,
    ...(card.curator_name ? { curator_name: card.curator_name } : {}),
  };
}

export function toDeckDTO(deck: ActiveDeck, byId: Map<string, IndexedMovie>, o: DtoOptions = {}): DeckDTO {
  return {
    deck_id: deck.deck_id,
    vibe: deck.vibe,
    size: deck.size,
    opened_at: deck.opened_at,
    cards: deck.cards.map((c: DeckCard) => toCardDTO(byId.get(c.movie_id)!, c, o)),
  };
}
