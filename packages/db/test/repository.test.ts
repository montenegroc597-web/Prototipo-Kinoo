import { KinooRunner } from '@kinoo/core';
import { hasNumbers } from '@kinoo/engine';
import { beforeAll, describe, expect, it } from 'vitest';
import { PostgresRepository } from '../src';
import { asUser, freshDb } from './db';

const ANA = '33333333-3333-4333-8333-333333333333';
const LEO = '44444444-4444-4444-8444-444444444444';
const NOW = new Date('2026-11-05T20:00:00Z');

// El repositorio de PostgreSQL con RLS activo: lo mismo que haría la API en cualquier nube.
describe.each(['postgres', 'supabase'] as const)('PostgresRepository · proveedor %s', (provider) => {
  let runner: KinooRunner;
  let pg: Awaited<ReturnType<typeof freshDb>>['pg'];
  beforeAll(async () => {
    const db = await freshDb({ provider });
    pg = db.pg;
    runner = new KinooRunner(new PostgresRepository(db.sql), { now: () => NOW });
  });

  it('lee la configuración y el catálogo de las tablas', async () => {
    const engine = await runner.engine();
    expect(engine.cfg.config.atoms).toHaveLength(21);
    expect(engine.cfg.weight('watch_confirmed', 'loved')?.eta).toBeCloseTo(0.25);
    expect(engine.catalog.list.length).toBeGreaterThanOrEqual(30);
    expect(engine.curatedDecks.some((d) => d.owner_kind === 'system')).toBe(true);
  });

  it('onboarding → mazo → guardar → cierre → Ver → "Me encantó": todo persiste y el perfil cambia', async () => {
    const pairs = await runner.run(ANA, (s) => s.onboarding({ step: 'pairs', n: 5 }));
    if (!('pairs' in pairs)) throw new Error('se esperaban pares');
    expect(pairs.pairs).toHaveLength(5);
    await runner.run(ANA, (s) => s.onboarding({ step: 'platforms', country: 'CO', providers: ['Netflix', 'Prime Video', 'Max', 'Disney+'] }));
    await runner.run(ANA, (s) =>
      s.onboarding({ step: 'choices', choices: pairs.pairs.map((p) => ({ chosen_movie_id: p.left_movie_id, rejected_movie_id: p.right_movie_id })) }),
    );

    const deck = await runner.run(ANA, (s) => s.openDeck({ vibe: 'llorar_bonito', size: 10 }));
    expect(deck.cards).toHaveLength(10);
    for (const c of deck.cards) expect(hasNumbers(c.explanation)).toBe(false);
    expect((await runner.run(ANA, (s) => s.currentDeck()))?.deck_id).toBe(deck.deck_id);

    const saved = deck.cards[0]!.movie_id;
    const r = await runner.run(ANA, (s) =>
      s.postEvents([
        { type: 'card_flipped', payload: { deck_id: deck.deck_id, slot: 1 } },
        { type: 'saved_intent', movie_id: saved, payload: { flipped: true, vibe: 'llorar_bonito', deck_id: deck.deck_id, slot: 1 } },
        ...deck.cards.slice(1).map((c) => ({ type: 'dismissed' as const, movie_id: c.movie_id, payload: { flipped: false, deck_id: deck.deck_id } })),
        { type: 'deck_completed', payload: { deck_id: deck.deck_id } },
      ] as never),
    );
    const closing = r.results.find((x) => x.closing)?.closing;
    expect(closing?.saved_posters.map((p) => p.movie_id)).toEqual([saved]);
    expect(hasNumbers(closing!.learned)).toBe(false);
    expect(await runner.run(ANA, (s) => s.currentDeck())).toBeNull();

    const before = await runner.run(ANA, (s) => s.profile());
    const w = await runner.run(ANA, (s) => s.watchProposal({}));
    expect(w.status).toBe('proposal');
    expect(w.card?.movie_id).toBe(saved);
    await runner.run(ANA, (s) =>
      s.postEvents([
        { type: 'watch_started', movie_id: saved, payload: { provider: 'Netflix' } },
        { type: 'watch_confirmed', movie_id: saved, payload: { reaction: 'loved' } },
      ] as never),
    );
    const after = await runner.run(ANA, (s) => s.profile());
    expect(after.signal_count).toBeGreaterThan(before.signal_count);
    expect(after.vector).not.toEqual(before.vector);
  });

  it('lo derivado queda en sus tablas y cada persona solo ve lo suyo', async () => {
    const mine = await asUser(pg, ANA, () => pg.query('select * from user_taste_profiles'));
    expect(mine.rows).toHaveLength(1);
    const states = await asUser(pg, ANA, () => pg.query<{ state: string }>('select state from user_movie_state'));
    expect(states.rows.map((r) => r.state)).toContain('seen');
    const leo = await asUser(pg, LEO, () => pg.query('select * from events'));
    expect(leo.rows).toHaveLength(0);
    // Leo empieza de cero aunque Ana ya tenga historial.
    expect((await runner.run(LEO, (s) => s.profile())).signal_count).toBe(0);
  });

  it('rechaza ids que no son UUID antes de tocar la base', async () => {
    await expect(runner.run('no-es-uuid', (s) => s.profile())).rejects.toThrow(/UUID/);
  });
});
