import { type CardDTO, type DeckDTO, type DeckRole, posterUrl } from '@kinoo/shared';
import type { IndexedMovie } from './catalog';
import type { ActiveDeck, DeckCard } from './deck';

/** Cómo se presentan los datos: país de las plataformas y desde dónde se sirven los pósters locales. */
export interface DtoOptions {
  country?: string;
  /** Base para pósters del repositorio ("posters/<id>.jpg"): por ejemplo "https://…/Prototipo-Kinoo/" o "../". */
  assetBaseUrl?: string;
}

/** Las dos caras de la carta. El back entrega ambas; el front decide cuál mostrar primero. */
export function toCardDTO(
  m: IndexedMovie,
  card: { slot: number; role: DeckRole; explanation: string; special_treatment: boolean; curator_name?: string },
  o: DtoOptions = {},
): CardDTO {
  const mv = m.movie;
  const country = o.country ?? 'CO';
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
