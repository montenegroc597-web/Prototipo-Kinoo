import { type CardDTO, type DeckDTO, type DeckRole, type Params, fitText, posterUrl } from '@kinoo/shared';
import type { IndexedMovie } from './catalog';
import type { ActiveDeck, DeckCard } from './deck';

/** Cómo se presentan los datos: país de las plataformas y desde dónde se sirven los pósters locales. */
export interface DtoOptions {
  country?: string;
  /** Base para pósters del repositorio ("posters/<id>.jpg"): por ejemplo "https://…/Prototipo-Kinoo/" o "../". */
  assetBaseUrl?: string;
  /** Estándar de caracteres de la carta (params card_*_max). */
  limits?: Pick<Params, 'card_premise_max' | 'card_title_max' | 'card_subtitle_max' | 'card_overview_max' | 'card_explanation_max' | 'card_pillar_max'>;
}

export const DEFAULT_CARD_LIMITS = {
  card_premise_max: 44,
  card_title_max: 24,
  card_subtitle_max: 40,
  card_overview_max: 110,
  card_explanation_max: 96,
  card_pillar_max: 18,
};

const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

/** "Una película de A y B"; si no cabe, solo el primer nombre (y "y otros" si cabe). */
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
  const L = { ...DEFAULT_CARD_LIMITS, ...(o.limits ?? {}) };
  const overview = mv.overview || sentenceCase(mv.hook);
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
