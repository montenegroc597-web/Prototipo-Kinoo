import { defaultConfig } from '@kinoo/config';
import type { EngineConfig, Movie } from '@kinoo/shared';
import { describe, expect, it } from 'vitest';
import pilot from '../../catalog/data/movies.pilot.json';
import { paletteFor, providerKey, relativeWhen, runtimeText } from '../src/billboard';
import { deckCounts } from '../src/closing';
import { KinooEngine } from '../src/engine';
import { hasNumbers } from '../src/explain';
import { ev, movie } from './helpers';

const NOW = new Date('2026-11-17T20:00:00Z');
const P = defaultConfig.params;
const LEVELS = ['alto', 'medio', 'bajo'];

const save = (id: string) => ev('saved_intent', { flipped: false }, { movie_id: id });
const dismiss = (id: string) => ev('dismissed', { flipped: false }, { movie_id: id });
const confirm = (id: string, reaction: 'loved' | 'liked' | 'not_for_me', extra: { rewatch?: boolean; fell_asleep?: boolean } = {}) =>
  ev('watch_confirmed', { reaction, ...extra }, { movie_id: id });

// Catálogo chico con perfiles claros: románticas (íntimas, cálidas, emotivas) y de acción (frenéticas, épicas).
const movies = [
  movie('amor1', { intimidad: 0.95, calida: 0.9, carga_emocional: 0.9 }, { genres: ['Drama', 'Romance'], runtime_min: 104 }),
  movie('amor2', { intimidad: 0.9, calida: 0.85, carga_emocional: 0.95 }),
  movie('amor3', { intimidad: 0.85, carga_emocional: 0.9, melancolica: 0.8 }),
  movie('accion1', { frenetica: 0.95, escala_epica: 0.95 }),
  movie('accion2', { frenetica: 0.9, escala_epica: 0.9, agil: 0.8 }),
  movie('accion3', { frenetica: 0.9, agil: 0.9 }),
  movie('neon1', { neon: 0.95, onirica: 0.6 }),
  movie('relleno', {}),
];
const engine = new KinooEngine(defaultConfig, movies);
const romantic = [save('amor1'), save('amor2'), save('amor3'), confirm('amor1', 'loved'), dismiss('accion1'), dismiss('accion2'), dismiss('accion3')];

describe('lo que el mazo dice de ti (insight)', () => {
  it('con pocas señales no opina: ready = false, textos vacíos y un texto para el estado vacío', () => {
    const r = engine.insight(engine.model('u', [save('amor1'), dismiss('accion1')]));
    expect(r.ready).toBe(false);
    expect(r.title).toBe('');
    expect(r.body).toBe('');
    expect(r.traits).toEqual([]);
    expect(r.moods).toEqual([]);
    expect(r.empty_text.length).toBeGreaterThan(0);
    expect(r.empty_text.length).toBeLessThanOrEqual(P.insight_empty_max);
    expect(hasNumbers(r.empty_text)).toBe(false);
  });

  it('con un perfil romántico claro: arquetipo, rasgos y moods esperados, en palabras', () => {
    const r = engine.insight(engine.model('u', romantic));
    expect(r.ready).toBe(true);
    expect(r.archetype.key).toBe('romantico');
    expect(r.title).toBe('ERES TODO UN ROMÁNTICO');
    expect(r.traits.length).toBeGreaterThan(0);
    expect(r.traits.length).toBeLessThanOrEqual(3);
    expect(r.traits.map((t) => t.key)).toEqual(expect.arrayContaining(['intimidad', 'carga_emocional']));
    expect(r.traits.map((t) => t.key)).not.toContain('frenetica');
    for (const t of r.traits) {
      expect(LEVELS).toContain(t.level);
      expect(t.label.length).toBeLessThanOrEqual(P.insight_trait_max);
    }
    expect(r.moods.length).toBeLessThanOrEqual(3);
    expect(r.moods[0]!.key).toBe('llorar_bonito');
    for (const m of r.moods) expect(LEVELS).toContain(m.level);
    expect(r.body).toMatch(/historias/);
  });

  it('ningún texto lleva cifras y todos respetan su límite', () => {
    const r = engine.insight(engine.model('u', romantic));
    const texts = [r.title, r.kicker, r.body, r.empty_text, ...r.traits.map((t) => t.label), ...r.moods.map((m) => m.name)];
    for (const t of texts) expect(hasNumbers(t), t).toBe(false);
    expect(r.title.length).toBeLessThanOrEqual(P.insight_title_max);
    expect(r.kicker.length).toBeLessThanOrEqual(P.insight_kicker_max);
    expect(r.body.length).toBeLessThanOrEqual(P.insight_body_max);
  });

  it('si una plantilla editada trae números, la frase no los muestra', () => {
    const cfg: EngineConfig = {
      ...defaultConfig,
      templates: defaultConfig.templates.map((t) => (t.key.startsWith('insight_body') ? { ...t, text: 'Te gusta un 93 % lo {a}.' } : t)),
    };
    const r = new KinooEngine(cfg, movies).insight(engine.model('u', romantic));
    expect(r.ready).toBe(true);
    expect(hasNumbers(r.body)).toBe(false);
  });

  it('solo descartes (ningún gusto positivo) no inventan un retrato', () => {
    const r = engine.insight(engine.model('u', ['accion1', 'accion2', 'accion3', 'neon1', 'amor1', 'amor2', 'amor3'].map(dismiss)));
    expect(r.ready).toBe(false);
  });
});

describe('super_liked (estrella, P7.3)', () => {
  it('tiene peso en la configuración: señal +0,8 y η 0,12', () => {
    const w = defaultConfig.actionWeights.find((x) => x.action === 'super_liked');
    expect(w).toMatchObject({ signal: 0.8, eta: 0.12 });
  });

  it('mueve el perfil más que guardar y deja la película en la mano con estrella', () => {
    const star = engine.model('u', [ev('super_liked', {}, { movie_id: 'amor1' })]);
    const saved = engine.model('u', [save('amor1')]);
    expect(star.signal_count).toBe(1);
    expect(star.profile.intimidad).toBeGreaterThan(saved.profile.intimidad);
    const st = star.states.get('amor1')!;
    expect(st.state).toBe('saved');
    expect(st.starred).toBe(true);
  });

  it('undo quita la estrella y su efecto', () => {
    const s = ev('super_liked', {}, { movie_id: 'amor2' });
    const m = engine.model('u', [save('amor2'), s, ev('undo', { undone_event_id: s.id })]);
    expect(m.states.get('amor2')!.starred).toBeFalsy();
    expect(m.signal_count).toBe(1);
  });

  it('una película con estrella sube en la cartelera', () => {
    const base = [...romantic.slice(0, 3), save('neon1')];
    const before = engine.billboard(engine.model('u', base), NOW, null).films.map((f) => f.id);
    expect(before.at(-1)).toBe('neon1');
    const after = engine.billboard(engine.model('u', [...base, ev('super_liked', {}, { movie_id: 'neon1' })]), NOW, null);
    expect(after.films[0]!.id).toBe('neon1');
    expect(after.films[0]!.starred).toBe(true);
  });
});

describe('cartelera y repisa de Ver', () => {
  it('calificar saca la película de la cartelera y la pone en la repisa; "volver a verla" la devuelve', () => {
    const evs = [save('amor1'), save('amor2')];
    expect(engine.billboard(engine.model('u', evs), NOW, null).films.map((f) => f.id)).toContain('amor1');

    const rated = [...evs, confirm('amor1', 'loved', { rewatch: true })];
    const m = engine.model('u', rated);
    expect(engine.billboard(m, NOW, null).films.map((f) => f.id)).toEqual(['amor2']);
    // Ver (una propuesta) tampoco la vuelve a proponer.
    expect(engine.watch(m, NOW).card!.movie_id).toBe('amor2');
    const shelf = engine.shelf(m, NOW);
    expect(shelf.map((s) => s.id)).toEqual(['amor1']);
    expect(shelf[0]!.rating).toBe('¡Obra maestra!');
    expect(shelf[0]!.when.length).toBeGreaterThan(0);
    expect(shelf[0]!.meta).toMatch(/h/);
    expect(shelf[0]!.providers.map((p) => p.key)).toEqual(['netflix']);
    expect(shelf[0]!.back.length).toBeGreaterThan(0);
    expect(shelf[0]!.title_size).toBe(engine.cfg.params.watch_title_size_short);

    const back = engine.model('u', [...rated, ev('rewatch_intent', {}, { movie_id: 'amor1' })]);
    expect(engine.billboard(back, NOW, null).films.map((f) => f.id)).toContain('amor1');
    expect(engine.shelf(back, NOW)).toEqual([]);
  });

  it('la repisa usa la calificación en palabras, incluido "Me dormí"', () => {
    const m = engine.model('u', [save('amor1'), save('amor2'), confirm('amor1', 'liked'), confirm('amor2', 'not_for_me', { fell_asleep: true })]);
    const byId = Object.fromEntries(engine.shelf(m, NOW).map((s) => [s.id, s.rating]));
    expect(byId).toEqual({ amor1: 'Estuvo bien', amor2: 'Me dormí' });
  });

  it('estados vacíos: sin mano, sin plataformas y sin nada para el mood', () => {
    expect(engine.billboard(engine.model('u', []), NOW, null)).toMatchObject({ status: 'empty_hand', films: [] });
    const plats = ev('platforms_set', { country: 'CO', providers: ['Mubi'] });
    expect(engine.billboard(engine.model('u', [plats, save('amor1')]), NOW, null).status).toBe('empty_platforms');
    const r = engine.billboard(engine.model('u', [save('accion1')]), NOW, 'llorar_bonito');
    expect(r.status).toBe('empty_mood');
    expect(r.mood.key).toBe('llorar_bonito');
    expect(hasNumbers(r.notice!)).toBe(false);
  });

  it('con mood, la cartelera solo trae lo que encaja; "todas" es el mood sin filtro', () => {
    const m = engine.model('u', [save('amor1'), save('accion1')]);
    expect(engine.billboard(m, NOW, 'llorar_bonito').films.map((f) => f.id)).toEqual(['amor1']);
    const all = engine.billboard(m, NOW, null);
    expect(all.mood.key).toBe('todas');
    expect(all.films).toHaveLength(2);
  });

  it('las plataformas de la persona van primero', () => {
    const e2 = new KinooEngine(defaultConfig, [movie('amor1', { intimidad: 0.9 }, { providers: { CO: ['Netflix', 'Max'] } }), movie('x', {})]);
    const f = e2.billboard(e2.model('u', [ev('platforms_set', { country: 'CO', providers: ['Max'] }), save('amor1')]), NOW, null).films[0]!;
    expect(f.providers.map((p) => p.name)).toEqual(['Max', 'Netflix']);
    expect(f.providers.map((p) => p.key)).toEqual(['max', 'netflix']);
    expect(f.providers.every((p) => p.rent === false)).toBe(true);
    expect(f.providers[0]!.note).not.toBe(f.providers[1]!.note);
  });

  it('la paleta sale de los átomos estéticos y siempre es la misma para la misma película', () => {
    const neon = engine.catalog.byId.get('neon1')!;
    expect(paletteFor(neon, engine.cfg)).toEqual(P.poster_palettes.neon);
    expect(paletteFor(engine.catalog.byId.get('relleno')!, engine.cfg)).toEqual(P.poster_palettes.default);
    expect(paletteFor(neon, engine.cfg)).toEqual(paletteFor(neon, engine.cfg));
  });

  it('cuándo, en palabras relativas y sin cifras; duración legible', () => {
    const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
    expect(relativeWhen(ago(0), NOW)).toBe('hoy');
    expect(relativeWhen(ago(1), NOW)).toBe('ayer');
    expect(relativeWhen(ago(3), NOW)).toBe('hace 3 días');
    expect(relativeWhen(ago(21), NOW)).toBe('hace 3 semanas');
    expect(relativeWhen(ago(45), NOW)).toBe('hace un mes');
    expect(relativeWhen(ago(400), NOW)).toBe('hace un año');
    expect(relativeWhen(ago(1000), NOW)).toBe('hace 2 años');
    for (const d of [0, 1, 2, 5, 8, 15, 27, 28, 29, 31, 70, 200, 364, 900, 5000]) {
      expect(relativeWhen(ago(d), NOW).length).toBeLessThanOrEqual(P.shelf_when_max);
    }
    expect(runtimeText(104)).toBe('1 h 44');
    expect(runtimeText(120)).toBe('2 h');
    expect(runtimeText(65)).toBe('1 h 05');
    expect(runtimeText(45)).toBe('45 min');
    expect(runtimeText(181)).toBe('3 h 01');
    expect(providerKey('Prime Video')).toBe('prime_video');
    expect(providerKey('Disney+')).toBe('disney_plus');
    expect(providerKey('Apple TV')).toBe('apple_tv');
  });

  it('el selector de moods trae "todas" primero y textos dentro del límite', () => {
    const moods = engine.moods();
    expect(moods[0]!.key).toBe('todas');
    expect(moods.length).toBe(defaultConfig.vibes.filter((v) => v.active).length + 1);
    for (const m of moods) {
      expect(m.name.length).toBeLessThanOrEqual(P.mood_name_max);
      expect(m.desc.length).toBeLessThanOrEqual(P.mood_desc_max);
    }
  });

  it('con el catálogo real: cada texto de la cartelera y la repisa cabe y la razón no tiene cifras', () => {
    const real = new KinooEngine(defaultConfig, (pilot as unknown as { movies: Movie[] }).movies);
    const ids = real.catalog.list.map((m) => m.movie.id);
    const evs = [
      ...ids.map(save),
      ...ids.slice(0, 20).map((id, i) => confirm(id, (['loved', 'liked', 'not_for_me'] as const)[i % 3]!, { rewatch: i % 2 === 0 })),
    ];
    const m = real.model('u', evs);
    for (const mood of real.moods()) {
      const b = real.billboard(m, NOW, mood.key === 'todas' ? null : mood.key);
      expect(b.films.length).toBeLessThanOrEqual(P.billboard_max_films);
      if (b.notice) expect(b.notice.length).toBeLessThanOrEqual(P.billboard_notice_max);
      for (const f of b.films) {
        expect(f.title_size).toBe(f.title.length <= P.watch_title_size_short_max ? P.watch_title_size_short : P.watch_title_size_long);
        expect(f.quote.charAt(0)).toBe(f.quote.charAt(0).toLocaleUpperCase('es'));
        expect(f.title.length).toBeLessThanOrEqual(P.watch_title_max);
        expect(f.meta.length).toBeLessThanOrEqual(P.watch_meta_max);
        expect(f.quote.length).toBeLessThanOrEqual(P.watch_why_max);
        expect(hasNumbers(f.quote), f.quote).toBe(false);
        expect(f.palette).toHaveLength(3);
        for (const p of f.providers) expect(p.note.length).toBeLessThanOrEqual(P.watch_provider_note_max);
      }
    }
    const shelf = real.shelf(m, NOW);
    expect(shelf).toHaveLength(20);
    for (const s of shelf) {
      expect(s.title.length).toBeLessThanOrEqual(P.shelf_title_max);
      expect(s.when.length).toBeLessThanOrEqual(P.shelf_when_max);
      expect(s.meta.length).toBeLessThanOrEqual(P.watch_meta_max);
      for (const p of s.providers) expect(p.note.length).toBeLessThanOrEqual(P.watch_provider_note_max);
      expect(s.rating.length).toBeLessThanOrEqual(P.shelf_rating_max);
      expect(s.back.length).toBeLessThanOrEqual(P.shelf_back_max);
      expect(hasNumbers(s.back), s.back).toBe(false);
    }
  });
});

describe('coherencia entre el cierre del mazo y lo que el mazo dice de ti', () => {
  // Si el cierre ya concluye un gusto ("Hoy te inclinaste por…"), Resumen, Perfil y Ver no pueden decir "desliza unas cartas más".
  it('con el catálogo real, tras un primer mazo de 5 guardadas y 5 descartadas, si el cierre opina, insight también', () => {
    const real = new KinooEngine(defaultConfig, (pilot as unknown as { movies: Movie[] }).movies);
    for (let k = 0; k < 6; k++) {
      const m = real.model('u', []);
      const d = real.openDeck(m, { deck_id: `d${k}`, now: NOW });
      // Patrones distintos de guardar y descartar.
      d.cards.forEach((c, i) => real.apply(m, ((i + k) % 2 === 0 ? save : dismiss)(c.movie_id)));
      const close = real.close(d, m);
      expect(close.counts.want + close.counts.pass).toBe(d.cards.length);
      if (close.top_atoms.length) expect(real.insight(m).ready, `mazo ${k}: ${close.learned}`).toBe(true);
    }
  });
});

describe('hallazgos de la revisión del PR #7', () => {
  it('la hoja usa las plataformas del país que eligió la persona, no el del motor', () => {
    const mx = movie('mx1', { intimidad: 0.9 }, { providers: { CO: ['Prime Video'], MX: ['Netflix'] } });
    const e2 = new KinooEngine(defaultConfig, [mx, ...movies]);
    const m = e2.model('u', [ev('platforms_set', { country: 'MX', providers: ['Netflix'] }), save('mx1')]);
    const f = e2.billboard(m, NOW, null).films.find((x) => x.id === 'mx1')!;
    expect(f.providers.map((p) => p.name)).toEqual(['Netflix']);
  });

  it('el cierre cuenta solo las acciones de este mazo, no descartes de mazos anteriores', () => {
    const old = ev('dismissed', { flipped: false, deck_id: 'mazo-viejo' }, { movie_id: 'accion1' });
    const now1 = ev('saved_intent', { flipped: false, deck_id: 'mazo-nuevo' }, { movie_id: 'amor1' });
    const now2 = ev('dismissed', { flipped: true, deck_id: 'mazo-nuevo' }, { movie_id: 'accion2' });
    const now3 = ev('dismissed', { flipped: true, deck_id: 'mazo-nuevo' }, { movie_id: 'amor2' });
    const now4 = ev('saved_intent', { flipped: true, deck_id: 'mazo-nuevo' }, { movie_id: 'amor2' }); // cambió de idea: cuenta la última
    expect(deckCounts('mazo-nuevo', [old, now1, now2, now3, now4])).toEqual({ want: 2, seen: 0, pass: 1 });
  });
});
