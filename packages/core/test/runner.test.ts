import { defaultConfig } from '@kinoo/config';
import { describe, expect, it } from 'vitest';
import { synthCatalog } from '../../engine/sim/synthCatalog';
import { KinooRunner, MemoryRepository } from '../src';

const NOW = new Date('2026-11-05T20:00:00Z');
const repo = () => new MemoryRepository({ config: defaultConfig, movies: synthCatalog(120, 7), curatedDecks: [], effectiveAtoms: new Map() });

describe('KinooRunner con el repositorio en memoria', () => {
  it('guarda solo lo nuevo y recalcula el perfil desde los eventos', async () => {
    const r = repo();
    const runner = new KinooRunner(r, { now: () => NOW });
    const deck = await runner.run('ana', (s) => s.openDeck({ size: 5 }));
    const id = deck.cards[0]!.movie_id;
    await runner.run('ana', (s) => s.postEvents([{ type: 'watch_confirmed', movie_id: id, payload: { reaction: 'loved' } }] as never));
    const p = await runner.run('ana', (s) => s.profile());
    expect(p.signal_count).toBe(1);
    expect((await r.loadUser('ana')).events.map((e) => e.type)).toEqual(['deck_opened', 'watch_confirmed']);
    expect(r.derived.get('ana')?.taste.signal_count).toBe(1);
  });

  it('undo deshace el efecto en el perfil sin borrar el historial', async () => {
    const r = repo();
    const runner = new KinooRunner(r, { now: () => NOW });
    const deck = await runner.run('leo', (s) => s.openDeck({ size: 5 }));
    const res = await runner.run('leo', (s) => {
      s.postEvents([{ type: 'saved_intent', movie_id: deck.cards[0]!.movie_id, payload: { flipped: false } }] as never);
      return s.newEvents.at(-1)!.id;
    });
    await runner.run('leo', (s) => s.postEvents([{ type: 'undo', payload: { undone_event_id: res } }] as never));
    expect((await runner.run('leo', (s) => s.profile())).signal_count).toBe(0);
    expect((await r.loadUser('leo')).events).toHaveLength(3);
  });

  it('cada persona tiene su propio historial', async () => {
    const r = repo();
    const runner = new KinooRunner(r, { now: () => NOW });
    await runner.run('ana', (s) => s.openDeck({ size: 5 }));
    expect((await r.loadUser('leo')).events).toEqual([]);
  });

  it('una petición sin cambios no escribe nada', async () => {
    const r = repo();
    const runner = new KinooRunner(r, { now: () => NOW });
    await runner.run('ana', (s) => s.profile());
    expect(r.derived.has('ana')).toBe(false);
  });
});
