// Usuarios sintéticos: tienen un gusto oculto y reaccionan a los mazos según ese gusto.
import type { AtomVector, KinooEvent, PartialAtomVector } from '@kinoo/shared';
import type { IndexedMovie } from '../src/catalog';
import type { KinooEngine } from '../src/engine';
import type { UserModel } from '../src/profile';
import { makeRng } from '../src/rng';
import { cosine, fromPartial } from '../src/vector';

export class SimUser {
  readonly id: string;
  hidden: AtomVector;
  /** Gusto oculto específico de un mood (si existe, manda dentro de ese mood). */
  hiddenByVibe: Record<string, AtomVector> = {};
  events: KinooEvent[] = [];
  model: UserModel;
  private n = 0;
  private readonly rng: () => number;
  private readonly t0: number;

  constructor(readonly engine: KinooEngine, id: string, hidden: PartialAtomVector, seed: number, readonly acceptShare = 0.15, readonly noise = 0.05) {
    this.id = id;
    this.hidden = fromPartial(hidden);
    this.rng = makeRng(seed);
    this.model = engine.model(id, []);
    this.t0 = Date.parse('2026-11-01T00:00:00Z');
  }

  now() { return new Date(this.t0 + this.n * 60_000); }

  tasteFor(vibe: string | null): AtomVector {
    return (vibe && this.hiddenByVibe[vibe]) || this.hidden;
  }

  /** Afinidad verdadera con una película. */
  affinity(m: IndexedMovie, vibe: string | null = null) { return cosine(this.tasteFor(vibe), m.hat); }

  /** Umbral para aceptar: el cuantil (1 − acceptShare) de su afinidad sobre el catálogo. */
  threshold(vibe: string | null = null): number {
    const a = this.engine.catalog.list.map((m) => this.affinity(m, vibe)).sort((x, y) => x - y);
    return a[Math.floor((1 - this.acceptShare) * (a.length - 1))]!;
  }

  wouldAccept(m: IndexedMovie, vibe: string | null = null, thr = this.threshold(vibe)) {
    return this.affinity(m, vibe) >= thr;
  }

  emit(e: Omit<KinooEvent, 'id' | 'user_id' | 'at'>) {
    this.n += 1;
    const full = { ...e, id: `${this.id}-e${this.n}`, user_id: this.id, at: this.now().toISOString() } as KinooEvent;
    this.events.push(full);
    this.engine.apply(this.model, full);
    return full;
  }

  signalCount() { return this.model.signal_count; }

  doOnboarding(pairs = 6) {
    for (const p of this.engine.onboarding(this.model, pairs)) {
      const l = this.engine.catalog.byId.get(p.left_movie_id)!, r = this.engine.catalog.byId.get(p.right_movie_id)!;
      const [ch, rj] = this.affinity(l) >= this.affinity(r) ? [l, r] : [r, l];
      this.emit({ type: 'onboarding_choice', movie_id: ch.movie.id, payload: { chosen_movie_id: ch.movie.id, rejected_movie_id: rj.movie.id } } as never);
    }
  }

  /** Abre un mazo y reacciona a cada carta. Devuelve el mazo. */
  playDeck(vibe: string | null = null, size = 10, stopAtSignals = Infinity, afterEach?: () => boolean) {
    const deck = this.engine.openDeck(this.model, { deck_id: `${this.id}-d${this.n}`, now: this.now(), vibe, size });
    this.emit({ type: 'deck_opened', payload: { deck_id: deck.deck_id, vibe, size } } as never);
    const thr = this.threshold(vibe);
    for (const c of deck.cards) {
      if (this.signalCount() >= stopAtSignals) break;
      const m = this.engine.catalog.byId.get(c.movie_id)!;
      let accept = this.wouldAccept(m, vibe, thr);
      if (this.rng() < this.noise) accept = !accept;
      const flipped = this.rng() < 0.5;
      if (accept) this.emit({ type: 'saved_intent', movie_id: m.movie.id, payload: { flipped, vibe, deck_id: deck.deck_id, slot: c.slot } } as never);
      else this.emit({ type: 'dismissed', movie_id: m.movie.id, payload: { flipped, vibe, deck_id: deck.deck_id, slot: c.slot } } as never);
      if (afterEach?.()) return deck;
    }
    // Ve una de las guardadas y cuenta qué tal.
    const saved = deck.cards.map((c) => this.engine.catalog.byId.get(c.movie_id)!).filter((m) => this.model.states.get(m.movie.id)?.state === 'saved');
    if (saved.length && this.signalCount() < stopAtSignals) {
      const m = saved[0]!;
      const a = this.affinity(m, vibe);
      const reaction = a >= thr + 0.05 ? 'loved' : a >= thr - 0.1 ? 'liked' : 'not_for_me';
      this.emit({ type: 'watch_confirmed', movie_id: m.movie.id, payload: { reaction, vibe } } as never);
      afterEach?.();
    }
    this.emit({ type: 'deck_completed', payload: { deck_id: deck.deck_id } } as never);
    return deck;
  }
}
