import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defaultConfig } from '@kinoo/config';
import { KinooEngine, hasNumbers, toCardDTO } from '@kinoo/engine';
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

describe('estándar de caracteres: lo que el back entrega a la carta', () => {
  it('en las 69 películas, ningún texto de display supera su límite', () => {
    const engine = new KinooEngine(defaultConfig, pilot.movies);
    const p = defaultConfig.params;
    const m = engine.model('u', []);
    const deck = engine.openDeck(m, { deck_id: 'd', now: new Date('2026-11-05T20:00:00Z'), size: 20 });
    const ids = new Set(deck.cards.map((c) => c.movie_id));
    // Se arma una carta por película (no solo las del mazo) con el mismo convertidor.
    const all = engine.catalog.list.map((im) =>
      toCardDTO(
        im,
        { slot: 1, role: 'afin', explanation: 'Encaja con tu gusto por historias que mueven por dentro y en blanco y negro o casi.', special_treatment: false },
        { limits: p, atoms: defaultConfig.atoms },
      ),
    );
    expect(ids.size).toBe(20);
    for (const c of all) {
      const d = c.display;
      expect(d.premise.length, c.movie_id).toBeLessThanOrEqual(p.card_premise_max);
      expect(d.title.length, c.movie_id).toBeLessThanOrEqual(p.card_title_max);
      expect(d.subtitle.length, c.movie_id).toBeLessThanOrEqual(p.card_subtitle_max);
      expect(d.overview.length, c.movie_id).toBeLessThanOrEqual(p.card_overview_max);
      expect(d.explanation.length, c.movie_id).toBeLessThanOrEqual(p.card_explanation_max);
      for (const v of Object.values(d.pillars)) expect(v.length, `${c.movie_id} ${v}`).toBeLessThanOrEqual(p.card_pillar_max);
      expect(d.dna_phrase.length, c.movie_id).toBeLessThanOrEqual(p.card_dna_phrase_max);
      expect(d.themes.join('').length, c.movie_id).toBeLessThanOrEqual(p.card_dna_themes_max_chars);
      expect(d.themes.length, c.movie_id).toBeGreaterThan(0);
    }
  });
});
