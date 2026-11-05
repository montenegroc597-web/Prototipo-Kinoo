import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Movie } from '@kinoo/shared';
import { ATOM_KEYS } from '@kinoo/shared';
import { defaultConfig } from '../../data/config';
import { KinooEngine, hasNumbers } from '@kinoo/engine';

const pilot = JSON.parse(readFileSync(path.resolve(__dirname, '../../data/catalog/movies.pilot.json'), 'utf8')) as { movies: Movie[]; team_deck: { uuid: string; owner_name: string; title: string; movie_ids: string[] } };

describe('catálogo piloto', () => {
  it('cada película cumple el esquema: 21 átomos entre 0 y 1, frase gancho ≤ 160 en mayúsculas, 4 pilares, trazabilidad', () => {
    expect(pilot.movies.length).toBeGreaterThanOrEqual(30);
    for (const m of pilot.movies) {
      expect(Object.keys(m.atoms).sort()).toEqual([...ATOM_KEYS].sort());
      for (const k of ATOM_KEYS) expect(m.atoms[k]).toBeGreaterThanOrEqual(0), expect(m.atoms[k]).toBeLessThanOrEqual(1);
      expect(m.hook.length).toBeLessThanOrEqual(160);
      expect(m.hook).toBe(m.hook.toUpperCase());
      expect(Object.keys(m.pillars).sort()).toEqual(['historia', 'ritmo', 'tono', 'visual']);
      expect(m.tagger.model && m.tagger.prompt_version && m.tagger.tagged_at).toBeTruthy();
    }
  });

  it('el motor arma un mazo de 10 con el catálogo real, con el rol creador del Equipo Kinoo', () => {
    const t = pilot.team_deck;
    const engine = new KinooEngine(defaultConfig, pilot.movies, { curatedDecks: [{ id: t.uuid, owner_kind: 'system', owner_id: 'equipo-kinoo', owner_name: t.owner_name, title: t.title, movie_ids: t.movie_ids }] });
    const m = engine.model('u', []);
    const deck = engine.openDeck(m, { deck_id: 'd', now: new Date('2026-11-05T20:00:00Z'), vibe: 'llorar_bonito' });
    expect(deck.cards.length).toBe(10);
    expect(deck.cards.some((c) => c.role === 'creador')).toBe(true);
    for (const c of deck.cards) expect(hasNumbers(c.explanation)).toBe(false);
  });
});
