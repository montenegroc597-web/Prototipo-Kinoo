import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { KinooEngine } from '@kinoo/engine';
import { KinooService, activeDeckToRow, derivedRows, eventToRow, rowToActiveDeck, rowToEvent, rowToMovie, rowsToConfig, rowsToCuratedDecks, rowsToEffectiveAtoms } from '@kinoo/api';
import { hasNumbers } from '@kinoo/engine';
import { asUser, freshDb } from './test/db';

const ANA = '33333333-3333-4333-8333-333333333333';
const NOW = new Date('2026-11-05T20:00:00Z');

// Recorre lo que haría una Edge Function, pero contra PostgreSQL local (PGlite) con RLS activo.
async function engineFrom(db: PGlite) {
  const q = async (sql: string) => (await db.query<Record<string, unknown>>(sql)).rows;
  const cfg = rowsToConfig({
    atoms: await q('select * from atoms'), vibes: await q('select * from vibes'), action_weights: await q('select * from action_weights'),
    deck_recipes: await q('select * from deck_recipes'), explanation_templates: await q('select * from explanation_templates'),
    archetypes: await q('select * from archetypes'), config: await q('select * from config'),
  });
  const movies = (await q('select * from movies')).map(rowToMovie);
  const decks = rowsToCuratedDecks(await q(`select * from decks where owner_kind in ('system','curator')`), await q('select * from deck_items'));
  const eff = rowsToEffectiveAtoms(await q('select * from movie_effective_atoms where votes > 0'));
  return new KinooEngine(cfg, movies, { curatedDecks: decks, effectiveAtoms: eff });
}

async function snapshot(db: PGlite) {
  return asUser(db, ANA, async () => {
    const ev = (await db.query<Record<string, unknown>>('select * from events order by at')).rows.map(rowToEvent);
    const d = (await db.query<Record<string, unknown>>('select * from active_decks order by opened_at desc limit 1')).rows[0];
    return { user_id: ANA, events: ev, active_deck: rowToActiveDeck(d) };
  });
}

async function persist(db: PGlite, svc: KinooService) {
  await asUser(db, ANA, async () => {
    for (const e of svc.newEvents) {
      const r = eventToRow(e);
      await db.query('insert into events (id, user_id, type, movie_id, at, context, payload) values ($1,$2,$3,$4,$5,$6,$7)', [r.id, r.user_id, r.type, r.movie_id, r.at, JSON.stringify(r.context), JSON.stringify(r.payload)]);
    }
    if (svc.deckChanged && svc.snap.active_deck) {
      const r = activeDeckToRow(svc.snap.active_deck);
      await db.query(`insert into active_decks (deck_id, user_id, vibe, size, opened_at, completed_at, cards, profile_before, special_used) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        on conflict (deck_id) do update set completed_at = excluded.completed_at, cards = excluded.cards, special_used = excluded.special_used`,
      [r.deck_id, r.user_id, r.vibe, r.size, r.opened_at, r.completed_at, JSON.stringify(r.cards), JSON.stringify(r.profile_before), r.special_used]);
    }
    const d = derivedRows(svc.userModel);
    await db.query(`insert into user_taste_profiles (user_id, vector, signal_count) values ($1,$2,$3) on conflict (user_id) do update set vector = excluded.vector, signal_count = excluded.signal_count`, [ANA, JSON.stringify(d.taste.vector), d.taste.signal_count]);
  });
}

describe('API sobre la base local (como las Edge Functions)', () => {
  let db: PGlite;
  let engine: KinooEngine;
  beforeAll(async () => { db = await freshDb(); engine = await engineFrom(db); });

  it('la configuración leída de las tablas es la misma que la de data/config', () => {
    expect(engine.cfg.config.atoms).toHaveLength(21);
    expect(engine.cfg.weight('watch_confirmed', 'loved')!.eta).toBeCloseTo(0.25);
    expect(engine.catalog.list.length).toBeGreaterThanOrEqual(30);
  });

  it('onboarding → abrir mazo → guardar → cerrar → Ver → "Me encantó": todo persiste y el perfil cambia', async () => {
    let svc = new KinooService(engine, await snapshot(db), () => NOW);
    const pairs = svc.onboarding({ step: 'pairs', n: 5 });
    expect('pairs' in pairs && pairs.pairs.length).toBe(5);
    svc.onboarding({ step: 'platforms', country: 'CO', providers: ['Netflix', 'Prime Video', 'Max', 'Disney+'] });
    if ('pairs' in pairs) svc.onboarding({ step: 'choices', choices: pairs.pairs.map((p) => ({ chosen_movie_id: p.left_movie_id, rejected_movie_id: p.right_movie_id })) });
    await persist(db, svc);

    svc = new KinooService(engine, await snapshot(db), () => NOW);
    const deck = svc.openDeck({ vibe: 'llorar_bonito', size: 10 });
    expect(deck.cards).toHaveLength(10);
    for (const c of deck.cards) { expect(c.front.hook).toBeTruthy(); expect(c.back.title).toBeTruthy(); expect(hasNumbers(c.explanation)).toBe(false); }
    await persist(db, svc);

    svc = new KinooService(engine, await snapshot(db), () => NOW);
    expect(svc.currentDeck()!.deck_id).toBe(deck.deck_id);
    const saved = deck.cards[0]!.movie_id;
    const r = svc.postEvents([
      { type: 'card_flipped', payload: { deck_id: deck.deck_id, slot: 1 } },
      { type: 'saved_intent', movie_id: saved, payload: { flipped: true, vibe: 'llorar_bonito', deck_id: deck.deck_id, slot: 1 } },
      ...deck.cards.slice(1).map((c) => ({ type: 'dismissed' as const, movie_id: c.movie_id, payload: { flipped: false, deck_id: deck.deck_id } })),
      { type: 'deck_completed', payload: { deck_id: deck.deck_id } },
    ] as never);
    expect(r.results.find((x) => x.save)).toBeDefined();
    const closing = r.results.find((x) => x.closing)!.closing!;
    expect(hasNumbers(closing.learned)).toBe(false);
    expect(closing.saved_posters.map((p) => p.movie_id)).toEqual([saved]);
    await persist(db, svc);

    svc = new KinooService(engine, await snapshot(db), () => NOW);
    expect(svc.currentDeck()).toBeNull();
    const before = { ...svc.userModel.profile };
    const w = svc.watchProposal({});
    expect(w.status).toBe('proposal');
    expect(w.card!.movie_id).toBe(saved);
    svc.postEvents([{ type: 'watch_started', movie_id: saved, payload: { provider: w.card!.back.providers[0] ?? 'Netflix' } }, { type: 'watch_confirmed', movie_id: saved, payload: { reaction: 'loved' } }] as never);
    await persist(db, svc);
    const after = new KinooService(engine, await snapshot(db), () => NOW).userModel.profile;
    expect(after).not.toEqual(before);

    // Lo derivado quedó en su tabla y solo Ana lo ve.
    const mine = await asUser(db, ANA, () => db.query('select * from user_taste_profiles'));
    expect(mine.rows).toHaveLength(1);
  });

  it('rechaza eventos de tipo desconocido o de películas que no existen', () => {
    const svc = new KinooService(engine, { user_id: ANA, events: [], active_deck: null });
    expect(() => svc.postEvents([{ type: 'swipe_up', payload: {} } as never])).toThrow(/desconocido/);
    expect(() => svc.postEvents([{ type: 'dismissed', movie_id: 'no-existe', payload: { flipped: false } } as never])).toThrow(/desconocida/);
    expect(() => svc.openDeck({ size: 7 })).toThrow(/5, 10 o 20/);
  });
});
