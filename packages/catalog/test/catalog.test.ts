import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defaultConfig } from '@kinoo/config';
import { KinooEngine, hasNumbers } from '@kinoo/engine';
import type { Movie } from '@kinoo/shared';
import { ATOM_KEYS } from '@kinoo/shared';
import { describe, expect, it } from 'vitest';

const pilot = JSON.parse(readFileSync(path.resolve(__dirname, '../data/movies.pilot.json'), 'utf8')) as {
  source: string;
  movies: Movie[];
  team_deck: { uuid: string; owner_name: string; title: string; movie_ids: string[] };
};

describe('catálogo piloto (movies.pilot.json)', () => {
  it('cada película cumple el esquema: 21 átomos entre 0 y 1, frase gancho ≤ 160 en mayúsculas, 4 pilares, trazabilidad', () => {
    expect(pilot.movies.length).toBeGreaterThanOrEqual(30);
    for (const m of pilot.movies) {
      expect(Object.keys(m.atoms).sort()).toEqual([...ATOM_KEYS].sort());
      for (const k of ATOM_KEYS) {
        expect(m.atoms[k]).toBeGreaterThanOrEqual(0);
        expect(m.atoms[k]).toBeLessThanOrEqual(1);
      }
      expect(m.hook.length).toBeLessThanOrEqual(160);
      expect(m.hook).toBe(m.hook.toUpperCase());
      expect(Object.keys(m.pillars).sort()).toEqual(['historia', 'ritmo', 'tono', 'visual']);
      expect(m.tagger.model && m.tagger.prompt_version && m.tagger.tagged_at).toBeTruthy();
      expect(m.tmdb_id).toBeTypeOf('number');
      expect(m.overview?.length).toBeGreaterThan(20);
    }
  });

  it('el mazo del Equipo Kinoo y las anclas apuntan a películas que existen', () => {
    const ids = new Set(pilot.movies.map((m) => m.id));
    for (const id of pilot.team_deck.movie_ids) expect(ids, id).toContain(id);
    const anchors = JSON.parse(readFileSync(path.resolve(__dirname, '../data/anchors.json'), 'utf8')).anchors as Array<{ id: string }>;
    for (const a of anchors) expect(ids, a.id).toContain(a.id);
  });

  it('el motor arma un mazo de 10 con el catálogo, con el rol creador del Equipo Kinoo y sin números en las explicaciones', () => {
    const t = pilot.team_deck;
    const engine = new KinooEngine(defaultConfig, pilot.movies, {
      curatedDecks: [{ id: t.uuid, owner_kind: 'system', owner_id: 'equipo-kinoo', owner_name: t.owner_name, title: t.title, movie_ids: t.movie_ids }],
    });
    const deck = engine.openDeck(engine.model('u', []), { deck_id: 'd', now: new Date('2026-11-05T20:00:00Z'), vibe: 'llorar_bonito' });
    expect(deck.cards.length).toBe(10);
    expect(deck.cards.some((c) => c.role === 'creador')).toBe(true);
    for (const c of deck.cards) expect(hasNumbers(c.explanation)).toBe(false);
  });
});

describe('pósters', () => {
  const inv = JSON.parse(readFileSync(path.resolve(__dirname, '../data/posters.json'), 'utf8')) as {
    posters: Record<string, { path: string; origin: string } | null>;
    missing: string[];
    orphans: string[];
  };
  const site = path.resolve(__dirname, '../../../apps/web/public');

  it('el inventario cubre todas las películas y no hay archivos huérfanos', () => {
    expect(Object.keys(inv.posters).sort()).toEqual(pilot.movies.map((m) => m.id).sort());
    expect(inv.orphans).toEqual([]);
  });

  it('cada póster local existe y el catálogo lo usa', () => {
    for (const [id, p] of Object.entries(inv.posters)) {
      if (p?.origin !== 'local') continue;
      expect(existsSync(path.join(site, p.path)), p.path).toBe(true);
      expect(pilot.movies.find((m) => m.id === id)?.poster_path).toBe(p.path);
    }
  });
});
