import type { CardDTO, DeckDTO, DeckRole } from '@kinoo/shared';
import type { IndexedMovie } from './catalog';
import type { ActiveDeck, DeckCard } from './deck';

/** Las dos caras de la carta. El back entrega ambas; el front decide cuál mostrar primero. */
export function toCardDTO(m: IndexedMovie, card: { slot: number; role: DeckRole; explanation: string; special_treatment: boolean; curator_name?: string }, country = 'CO'): CardDTO {
  const mv = m.movie;
  return {
    slot: card.slot,
    role: card.role,
    movie_id: mv.id,
    front: { hook: mv.hook, pillars: mv.pillars },
    back: {
      title: mv.title, year: mv.year, runtime_min: mv.runtime_min, genres: mv.genres, directors: mv.directors,
      poster_path: mv.poster_path ?? null, overview: mv.overview ?? '', providers: mv.providers?.[country] ?? [],
    },
    explanation: card.explanation,
    special_treatment: card.special_treatment,
    ...(card.curator_name ? { curator_name: card.curator_name } : {}),
  };
}

export function toDeckDTO(deck: ActiveDeck, byId: Map<string, IndexedMovie>, country = 'CO'): DeckDTO {
  return {
    deck_id: deck.deck_id,
    vibe: deck.vibe,
    size: deck.size,
    opened_at: deck.opened_at,
    cards: deck.cards.map((c: DeckCard) => toCardDTO(byId.get(c.movie_id)!, c, country)),
  };
}
