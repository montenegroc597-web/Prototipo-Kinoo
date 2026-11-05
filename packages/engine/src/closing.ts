import { ATOM_KEYS, type AtomKey, type DeckClosingDTO } from '@kinoo/shared';
import { availableOn } from './candidates';
import type { Catalog } from './catalog';
import type { ConfigIndex } from './configIndex';
import type { ActiveDeck } from './deck';
import { fill } from './explain';
import type { UserModel } from './profile';

/** Cierre del mazo (9.4): los dos átomos que más subieron, pósteres de lo guardado y "Ya sabemos bastante". */
export function closeDeck(deck: ActiveDeck, model: UserModel, catalog: Catalog, cfg: ConfigIndex): DeckClosingDTO {
  const rose: Array<[AtomKey, number]> = ATOM_KEYS.map((k) => [k, model.profile[k] - deck.profile_before[k]]);
  const top = rose.filter(([, d]) => d > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  const labels = top.map((k) => cfg.label(k));
  const learned = labels.length === 2
    ? fill(cfg.template('deck_learned'), { a: labels[0]!, b: labels[1]! })
    : labels.length === 1 ? fill(cfg.template('deck_learned_single'), { a: labels[0]! }) : cfg.template('deck_learned_none');

  const ids = new Set(deck.cards.map((c) => c.movie_id));
  const saved = [...model.states.values()].filter((s) => ids.has(s.movie_id) && s.state === 'saved');
  const hand = [...model.states.values()].filter((s) => s.state === 'saved' || s.state === 'rewatch');
  const ready = hand.filter((s) => {
    const m = catalog.byId.get(s.movie_id);
    return m && (!model.providers || !model.providers.list.length || availableOn(m, model.providers));
  });
  return {
    deck_id: deck.deck_id,
    learned,
    top_atoms: top,
    saved_posters: saved.map((s) => { const m = catalog.byId.get(s.movie_id)!.movie; return { movie_id: m.id, title: m.title, poster_path: m.poster_path ?? null }; }),
    ready_tonight: ready.length >= cfg.params.deck_ready_tonight_min,
  };
}
