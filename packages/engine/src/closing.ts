import { ATOM_KEYS, type AtomKey, type DeckClosingDTO, type KinooEvent, posterUrl } from '@kinoo/shared';
import { availableOn } from './candidates';
import type { Catalog } from './catalog';
import type { ConfigIndex } from './configIndex';
import type { ActiveDeck } from './deck';
import { fill } from './explain';
import { type UserModel, inHand } from './profile';

/** Cierre del mazo (9.4): los dos átomos que más subieron, pósteres de lo guardado y "Ya sabemos bastante". */
/** Conteos del mazo: la última acción de cada carta con payload.deck_id de este mazo (no estados de mazos anteriores). */
export function deckCounts(deckId: string, events: KinooEvent[]): { want: number; seen: number; pass: number } {
  const last = new Map<string, string>();
  const undone = new Set(events.filter((e) => e.type === 'undo').map((e) => (e.payload as { undone_event_id?: string }).undone_event_id));
  for (const e of events) {
    if (!e.movie_id || undone.has(e.id)) continue;
    if (e.type !== 'saved_intent' && e.type !== 'marked_seen' && e.type !== 'dismissed') continue;
    if ((e.payload as { deck_id?: string } | undefined)?.deck_id !== deckId) continue;
    last.set(e.movie_id, e.type);
  }
  const v = [...last.values()];
  return {
    want: v.filter((t) => t === 'saved_intent').length,
    seen: v.filter((t) => t === 'marked_seen').length,
    pass: v.filter((t) => t === 'dismissed').length,
  };
}

export function closeDeck(
  deck: ActiveDeck,
  model: UserModel,
  catalog: Catalog,
  cfg: ConfigIndex,
  assetBaseUrl?: string,
  events?: KinooEvent[],
): DeckClosingDTO {
  const rose: Array<[AtomKey, number]> = ATOM_KEYS.map((k) => [k, model.profile[k] - deck.profile_before[k]]);
  const top = rose
    .filter(([, d]) => d > 1e-4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);
  const ids = new Set(deck.cards.map((c) => c.movie_id));
  const inDeck = [...model.states.values()].filter((s) => ids.has(s.movie_id));
  const saved = inDeck.filter((s) => s.state === 'saved');
  // Con muy pocas cartas guardadas, la conclusión sería ruido: se usa la frase neutra.
  const enough = saved.length >= (cfg.params.closing_min_saves ?? 2);
  const labels = enough ? top.map((k) => cfg.label(k)) : [];
  const learned =
    labels.length === 2
      ? fill(cfg.template('deck_learned'), { a: labels[0]!, b: labels[1]! })
      : labels.length === 1
        ? fill(cfg.template('deck_learned_single'), { a: labels[0]! })
        : cfg.template('deck_learned_none');

  const hand = [...model.states.values()].filter(inHand);
  const ready = hand.filter((s) => {
    const m = catalog.byId.get(s.movie_id);
    return m && (!model.providers || !model.providers.list.length || availableOn(m, model.providers));
  });
  return {
    deck_id: deck.deck_id,
    learned,
    top_atoms: enough ? top : [],
    saved_posters: saved.map((s) => {
      const m = catalog.byId.get(s.movie_id)!.movie;
      return { movie_id: m.id, title: m.title, poster_path: m.poster_path ?? null, poster_url: posterUrl(m.poster_path, { assetBaseUrl }) };
    }),
    ready_tonight: ready.length >= cfg.params.deck_ready_tonight_min,
    counts: events
      ? deckCounts(deck.deck_id, events)
      : {
          want: inDeck.filter((s) => s.state === 'saved' || s.state === 'rewatch').length,
          seen: inDeck.filter((s) => s.state === 'seen').length,
          pass: inDeck.filter((s) => s.state === 'dismissed').length,
        },
    vibe: deck.vibe,
  };
}
