// Estudio de perfilamiento: personas recorren la app (onboarding, mazos, Ver) con el catálogo real
// y medimos qué tan rápido y qué tan bien el motor las entiende. Uso: npm run sim:perfiles
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { defaultConfig } from '@kinoo/config';
import { ATOM_KEYS, type AtomKey, type KinooEvent, type Movie } from '@kinoo/shared';
import pilot from '../../catalog/data/movies.pilot.json';
import { discoverCandidates } from '../src/candidates';
import type { IndexedMovie } from '../src/catalog';
import { KinooEngine } from '../src/engine';
import { makeRng } from '../src/rng';
import { cosine, fromPartial, topAtoms } from '../src/vector';
import { PERSONAS, type Persona } from './personas';

const catalog = pilot as unknown as { movies: Movie[]; team_deck: { uuid: string; owner_name: string; title: string; movie_ids: string[] } };
export const engine = new KinooEngine(defaultConfig, catalog.movies, {
  curatedDecks: [
    {
      id: catalog.team_deck.uuid,
      owner_kind: 'system',
      owner_id: 'equipo-kinoo',
      owner_name: catalog.team_deck.owner_name,
      title: catalog.team_deck.title,
      movie_ids: catalog.team_deck.movie_ids,
    },
  ],
});

/** Afinidad verdadera de una persona con una película (en el espacio del rasgo distintivo). */
export const affinity = (taste: ReturnType<typeof fromPartial>, m: IndexedMovie) => cosine(taste, m.hat);

export interface DeckLog {
  deck: number;
  vibe: string | null;
  signals: number;
  hitRate: number;
  remainingGood: number;
  candidates: number;
  capture: number;
  randomExpected: number;
  accepted: string[];
  cosToTaste: number;
  top: AtomKey[];
  archetype: string;
  explanations: string[];
}
export interface PersonaResult {
  persona: Persona;
  acceptShare: number;
  catalogAcceptable: number;
  decks: DeckLog[];
  eventsToReliable: number | null;
  finalTop: AtomKey[];
  trueTop: AtomKey[];
  archetype: string;
  cryRecipeShift?: { cosToSeed: number; rose: AtomKey[] };
  watched: Array<{ title: string; reaction: string }>;
}

export function runPersona(p: Persona, opts: { decks?: number; noise?: number; seed?: number } = {}): PersonaResult {
  const rng = makeRng(opts.seed ?? 11);
  const taste = fromPartial(p.taste);
  const cry = p.cryTaste ? fromPartial(p.cryTaste) : taste;
  const noise = opts.noise ?? 0.1;
  // Acepta lo que de verdad le encaja: su cuarto superior del catálogo.
  const aff = engine.catalog.list.map((m) => affinity(taste, m)).sort((a, b) => a - b);
  const thr = aff[Math.floor(0.75 * (aff.length - 1))]!;
  const affCry = engine.catalog.list.map((m) => affinity(cry, m)).sort((a, b) => a - b);
  const thrCry = affCry[Math.floor(0.75 * (affCry.length - 1))]!;
  const accept = (m: IndexedMovie, vibe: string | null) => (vibe === 'llorar_bonito' ? affinity(cry, m) >= thrCry : affinity(taste, m) >= thr);

  const events: KinooEvent[] = [];
  let n = 0;
  const t0 = Date.parse('2026-11-05T19:00:00Z');
  const model = engine.model(p.key, []);
  const emit = (e: Omit<KinooEvent, 'id' | 'user_id' | 'at'>) => {
    n++;
    const full = { ...e, id: `${p.key}-${n}`, user_id: p.key, at: new Date(t0 + n * 90_000).toISOString() } as KinooEvent;
    events.push(full);
    engine.apply(model, full);
  };

  // 1) Onboarding: plataformas y 6 duelos "¿Esta o esta?".
  emit({ type: 'platforms_set', payload: { country: 'CO', providers: ['Netflix', 'Prime Video', 'Max', 'Disney+'] } } as never);
  for (const pair of engine.onboarding(model, 6)) {
    const l = engine.catalog.byId.get(pair.left_movie_id)!;
    const r = engine.catalog.byId.get(pair.right_movie_id)!;
    const [ch, rj] = affinity(taste, l) >= affinity(taste, r) ? [l, r] : [r, l];
    emit({ type: 'onboarding_choice', movie_id: ch.movie.id, payload: { chosen_movie_id: ch.movie.id, rejected_movie_id: rj.movie.id } } as never);
  }

  const decks: DeckLog[] = [];
  const watched: PersonaResult['watched'] = [];
  let reliableAt: number | null = null;
  const nDecks = opts.decks ?? 5;
  for (let d = 0; d < nDecks; d++) {
    // Un mazo de cada tres en "Llorar bonito" si la persona tiene su propia idea de ese mood.
    const vibe = p.cryTaste && d % 3 === 1 ? 'llorar_bonito' : null;
    const now = new Date(t0 + n * 90_000);
    const cands = discoverCandidates(engine.catalog, model, engine.cfg, now);
    const remainingGood = cands.filter((m) => accept(m, vibe)).length;
    const deck = engine.openDeck(model, { deck_id: `${p.key}-d${d}`, now, vibe, size: 10 });
    const explanations = deck.cards.slice(0, 3).map((c) => c.explanation);
    emit({ type: 'deck_opened', payload: { deck_id: deck.deck_id, vibe, size: 10 } } as never);
    const accepted: string[] = [];
    let hits = 0;
    for (const c of deck.cards) {
      const m = engine.catalog.byId.get(c.movie_id)!;
      const truly = accept(m, vibe);
      if (truly) hits++;
      const says = rng() < noise ? !truly : truly;
      const flipped = rng() < 0.6;
      if (says) {
        accepted.push(m.movie.title);
        emit({ type: 'saved_intent', movie_id: m.movie.id, payload: { flipped, vibe, deck_id: deck.deck_id, slot: c.slot } } as never);
      } else emit({ type: 'dismissed', movie_id: m.movie.id, payload: { flipped, vibe, deck_id: deck.deck_id, slot: c.slot } } as never);
      if (reliableAt === null && model.signal_count > 6 && cosine(model.profile, taste) >= 0.7) reliableAt = model.signal_count;
    }
    emit({ type: 'deck_completed', payload: { deck_id: deck.deck_id } } as never);
    // 2) Ver: esa noche ve la propuesta y cuenta qué tal.
    const w = engine.watch(model, new Date(t0 + n * 90_000), vibe ? { vibe } : {});
    if (w.card) {
      const m = engine.catalog.byId.get(w.card.movie_id)!;
      const a = vibe === 'llorar_bonito' ? affinity(cry, m) : affinity(taste, m);
      const reaction = a >= thr + 0.1 ? 'loved' : a >= thr - 0.1 ? 'liked' : 'not_for_me';
      emit({ type: 'watch_started', movie_id: m.movie.id, payload: { provider: w.card.back.providers[0] ?? 'Netflix' } } as never);
      emit({ type: 'watch_confirmed', movie_id: m.movie.id, payload: { reaction, vibe } } as never);
      watched.push({ title: m.movie.title, reaction });
    }
    const prof = engine.profile(model);
    decks.push({
      deck: d + 1,
      vibe,
      signals: model.signal_count,
      hitRate: hits / deck.cards.length,
      accepted,
      remainingGood,
      candidates: cands.length,
      capture: remainingGood ? hits / Math.min(deck.cards.length, remainingGood) : 1,
      randomExpected: cands.length ? (remainingGood / cands.length) * deck.cards.length : 0,
      cosToTaste: cosine(model.profile, taste),
      top: topAtoms(model.profile, 3, { positiveOnly: true }),
      archetype: prof.archetype.name,
      explanations,
    });
  }
  const seed = fromPartial(defaultConfig.vibes.find((v) => v.key === 'llorar_bonito')!.recipe);
  const cr = model.vibes.llorar_bonito?.recipe;
  return {
    persona: p,
    acceptShare: 0.25,
    catalogAcceptable: engine.catalog.list.filter((m) => affinity(taste, m) >= thr).length,
    decks,
    eventsToReliable: reliableAt,
    finalTop: topAtoms(model.profile, 4, { positiveOnly: true }),
    trueTop: [...ATOM_KEYS]
      .filter((k) => (p.taste[k] ?? 0) > 0)
      .sort((a, b) => (p.taste[b] ?? 0) - (p.taste[a] ?? 0))
      .slice(0, 4),
    archetype: engine.profile(model).archetype.name,
    ...(cr
      ? {
          cryRecipeShift: {
            cosToSeed: cosine(cr, seed),
            rose: [...ATOM_KEYS]
              .filter((k) => cr[k] - seed[k] > 0.03)
              .sort((a, b) => cr[b] - seed[b] - (cr[a] - seed[a]))
              .slice(0, 3),
          },
        }
      : {}),
    watched,
  };
}

/** Azar: proporción de películas aceptables en un mazo de 10 sacado al azar del catálogo. */
export const randomHitRate = 0.25;

if (process.argv[1]?.endsWith('profiling.ts')) {
  const results = PERSONAS.map((p, i) => runPersona(p, { seed: 100 + i }));
  const out = path.join(path.dirname(new URL(import.meta.url).pathname), 'perfiles.json');
  writeFileSync(
    out,
    JSON.stringify(
      results.map((r) => ({ ...r, persona: { key: r.persona.key, name: r.persona.name } })),
      null,
      2,
    ) + '\n',
  );
  for (const r of results) {
    console.log(
      `\n${r.persona.name} · aceptables ${r.catalogAcceptable}/69 · confiable en ${r.eventsToReliable ?? '—'} señales · arquetipo ${r.archetype} (esperado ${r.persona.expectedArchetype})`,
    );
    console.log(`  verdad: ${r.trueTop.join(', ')} | motor: ${r.finalTop.join(', ')}`);
    for (const d of r.decks)
      console.log(
        `  mazo ${d.deck}${d.vibe ? ' (' + d.vibe + ')' : ''}: ${Math.round(d.hitRate * 10)}/10 (azar ${d.randomExpected.toFixed(1)}; le quedaban ${d.remainingGood} de ${d.candidates}; captura ${(d.capture * 100).toFixed(0)}%) · coseno ${d.cosToTaste.toFixed(2)} · top ${d.top.join('/')} · ${d.archetype}`,
      );
    if (r.cryRecipeShift)
      console.log(`  llorar bonito: coseno con la semilla ${r.cryRecipeShift.cosToSeed.toFixed(2)}, subió ${r.cryRecipeShift.rose.join(', ')}`);
    console.log(`  vio: ${r.watched.map((w) => `${w.title} (${w.reaction})`).join('; ')}`);
  }
}
