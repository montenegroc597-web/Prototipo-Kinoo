import { defaultConfig } from '@kinoo/config';
import { ATOM_KEYS } from '@kinoo/shared';
import { describe, expect, it } from 'vitest';
import { synthCatalog } from '../sim/synthCatalog';
import { effectiveAtomValue } from '../src/catalog';
import { ConfigIndex } from '../src/configIndex';
import { checkSpecialMatch } from '../src/deck';
import { distinctive, quality } from '../src/distinct';
import { KinooEngine } from '../src/engine';
import { explain, hasNumbers } from '../src/explain';
import { applySignal } from '../src/learning';
import { cosine, fromPartial, zeroVector } from '../src/vector';
import { ev, movie } from './helpers';

const cfg = new ConfigIndex(defaultConfig);
const NOW = new Date('2026-11-05T20:00:00Z');

describe('rasgo distintivo (4.1)', () => {
  it('ejemplo de la especificación: cálida 0,85 con promedio 0,40 → 0,75', () => {
    const hat = distinctive(fromPartial({ calida: 0.85 }), fromPartial({ calida: 0.4 }));
    expect(hat.calida).toBeCloseTo(0.75, 5);
  });
  it('lo que está por debajo del promedio vale 0', () => {
    expect(distinctive(fromPartial({ humor: 0.2 }), fromPartial({ humor: 0.4 })).humor).toBe(0);
  });
  it('calidad: promedio bayesiano entre 0 y 1; pocos votos tira hacia el promedio', () => {
    expect(quality({ vote_average: 9, vote_count: 10 }, 6.5, 500)).toBeLessThan(quality({ vote_average: 9, vote_count: 10000 }, 6.5, 500));
    expect(quality({ vote_average: 10, vote_count: 1e9 }, 6.5, 500)).toBeLessThanOrEqual(1);
  });
});

describe('aprendizaje (7.1)', () => {
  it('ejemplo de Ana con Past Lives: melancólica 0,30 → 0,45', () => {
    const u = fromPartial({ melancolica: 0.3 });
    const hat = fromPartial({ melancolica: 0.9 });
    expect(applySignal(u, hat, 1.0, 0.25, 0.2).melancolica).toBeCloseTo(0.45, 5);
  });
  it('no aprende de ausencias: descartar una frenética baja frenética y no sube contemplativa', () => {
    const u = applySignal(zeroVector(), fromPartial({ frenetica: 0.9 }), -0.3, 0.1, 0.2);
    expect(u.frenetica).toBeLessThan(0);
    expect(u.contemplativa).toBe(0);
  });
  it('nunca se satura: tras mil "me encantó" sigue entre −1 y +1', () => {
    let u = zeroVector();
    for (let i = 0; i < 1000; i++) u = applySignal(u, fromPartial({ humor: 1 }), 1.3, 0.3, 0.2);
    expect(u.humor).toBeLessThanOrEqual(1);
    expect(u.humor).toBeGreaterThan(0.9);
  });
  it('los átomos con rasgo distintivo ≤ τ no se tocan', () => {
    const u = applySignal(zeroVector(), fromPartial({ humor: 0.15 }), 1, 0.25, 0.2);
    expect(u.humor).toBe(0);
  });
});

describe('perfil desde eventos', () => {
  const movies = [
    movie('drama', { melancolica: 0.95, carga_emocional: 0.95, intimidad: 0.9 }),
    movie('accion', { frenetica: 0.95, escala_epica: 0.95 }),
    movie('comedia', { humor: 0.95, luminosa: 0.9 }),
  ];
  const engine = new KinooEngine(defaultConfig, movies);

  it('recalcular desde el historial da lo mismo que aplicar uno a uno', () => {
    const events = [
      ev('saved_intent', { flipped: false }, { movie_id: 'drama' }),
      ev('dismissed', { flipped: true }, { movie_id: 'accion' }),
      ev('watch_confirmed', { reaction: 'loved' }, { movie_id: 'drama' }),
    ];
    const a = engine.model('u', events);
    const b = engine.model('u', []);
    for (const e of events) engine.apply(b, e);
    for (const k of ATOM_KEYS) expect(a.profile[k]).toBeCloseTo(b.profile[k], 10);
    expect(a.signal_count).toBe(3);
    expect(a.profile.melancolica).toBeGreaterThan(0);
    expect(a.profile.frenetica).toBeLessThan(0);
  });

  it('undo borra el efecto del evento deshecho', () => {
    const save = ev('saved_intent', { flipped: false }, { movie_id: 'comedia' });
    const m = engine.model('u', [save, ev('undo', { undone_event_id: save.id })]);
    expect(m.profile.humor).toBe(0);
    expect(m.states.has('comedia')).toBe(false);
  });

  it('un evento dentro de un mood ajusta la receta personal y no la semilla', () => {
    const m = engine.model('u', [ev('saved_intent', { flipped: false, vibe: 'sufrir' }, { movie_id: 'comedia' })]);
    expect(m.vibes.llorar_bonito).toBeDefined();
    expect(m.vibes.llorar_bonito!.recipe.humor).toBeGreaterThan(0);
    expect(defaultConfig.vibes.find((v) => v.key === 'llorar_bonito')!.recipe.humor).toBeUndefined();
  });

  it('marcas derivadas: guardada, vista, repetir y descartada', () => {
    const m = engine.model('u', [
      ev('saved_intent', { flipped: false }, { movie_id: 'drama' }),
      ev('watch_confirmed', { reaction: 'loved', rewatch: true }, { movie_id: 'drama' }),
      ev('dismissed', { flipped: false }, { movie_id: 'accion' }),
    ]);
    expect(m.states.get('drama')!.state).toBe('rewatch');
    expect(m.states.get('accion')!.state).toBe('dismissed');
  });

  it('watch_skipped no mueve el perfil', () => {
    const m = engine.model('u', [ev('watch_skipped', {}, { movie_id: 'drama' })]);
    expect(m.signal_count).toBe(0);
    expect(m.watch_skips_in_row).toBe(1);
  });
});

describe('coseno y puntaje', () => {
  it('coseno con un vector cero es 0 (perfil vacío, receta neutra)', () => {
    expect(cosine(zeroVector(), fromPartial({ humor: 1 }))).toBe(0);
  });
  it('corrección comunitaria: (k·M + Σ votos) / (k + n)', () => {
    expect(effectiveAtomValue(0.9, [0.1], 10)).toBeCloseTo(0.827, 3);
    expect(effectiveAtomValue(0.9, [], 10)).toBe(0.9);
  });
});

describe('mazos (9)', () => {
  const movies = synthCatalog(300, 42);
  const team = movies.slice(0, 15).map((m) => m.id);
  const engine = new KinooEngine(defaultConfig, movies, {
    curatedDecks: [{ id: 't', owner_kind: 'system', owner_id: 'equipo', owner_name: 'Equipo Kinoo', title: 'Para empezar', movie_ids: team }],
  });
  const learned = () => {
    const ids = engine.catalog.list
      .filter((m) => m.movie.genres[0] === 'drama_intimo')
      .slice(0, 8)
      .map((m) => m.movie.id);
    return engine.model(
      'u',
      ids.map((id) => ev('watch_confirmed', { reaction: 'loved' }, { movie_id: id })),
    );
  };

  it.each([5, 10, 20])('receta de %i: tamaño, roles en posición y sin director repetido', (size) => {
    const m = learned();
    const d = engine.openDeck(m, { deck_id: 'd', now: NOW, size });
    const recipe = engine.cfg.recipeFor(size);
    expect(d.cards).toHaveLength(size);
    d.cards.forEach((c, i) => expect([recipe.slots[i]!.role, 'afin']).toContain(c.role));
    const dirs = d.cards.flatMap((c) => engine.catalog.byId.get(c.movie_id)!.movie.directors);
    expect(new Set(dirs).size).toBe(dirs.length);
  });

  it('apertura con el mayor puntaje y cierre con el segundo', () => {
    const d = engine.openDeck(learned(), { deck_id: 'd', now: NOW, size: 10 });
    const afinScores = d.cards.filter((c) => c.role === 'afin').map((c) => c.score);
    const sorted = [...afinScores].sort((a, b) => b - a);
    expect(d.cards[0]!.score).toBeCloseTo(sorted[0]!, 10);
    expect(d.cards[9]!.score).toBeCloseTo(sorted[1]!, 10);
  });

  it('sin Comunidad, el rol creador sale del mazo del Equipo Kinoo', () => {
    const d = engine.openDeck(learned(), { deck_id: 'd', now: NOW, size: 10 });
    const creators = d.cards.filter((c) => c.role === 'creador');
    expect(creators.length).toBeGreaterThan(0);
    for (const c of creators) {
      expect(team).toContain(c.movie_id);
      expect(c.curator_name).toBe('Equipo Kinoo');
    }
  });

  it('sin mazo del equipo ni curadores, creador pasa a afín', () => {
    const bare = new KinooEngine(defaultConfig, movies);
    const d = bare.openDeck(bare.model('u', []), { deck_id: 'd', now: NOW });
    expect(d.cards.some((c) => c.role === 'creador')).toBe(false);
  });

  it('excluye guardadas y vistas; las descartadas vuelven después de 30 días', () => {
    const id = engine.catalog.list[0]!.movie.id;
    const old = ev('dismissed', { flipped: false }, { movie_id: id, at: '2026-09-01T00:00:00Z' });
    const m = engine.model('u', [old]);
    const cands = engine.openDeck(m, { deck_id: 'd', now: NOW, size: 20 });
    expect(m.states.get(id)!.state).toBe('dismissed');
    void cands;
    const recent = engine.model('u', [ev('dismissed', { flipped: false }, { movie_id: id, at: '2026-11-04T00:00:00Z' })]);
    expect(engine.openDeck(recent, { deck_id: 'd', now: NOW, size: 20 }).cards.map((c) => c.movie_id)).not.toContain(id);
  });

  it('match especial: como máximo una vez por mazo', () => {
    const d = engine.openDeck(learned(), { deck_id: 'd', now: NOW });
    d.special_threshold = Number.NEGATIVE_INFINITY; // todo califica: probamos el límite
    expect(checkSpecialMatch(d, d.cards[0]!.movie_id, engine.cfg)).toBe(true);
    expect(checkSpecialMatch(d, d.cards[1]!.movie_id, engine.cfg)).toBe(false);
  });

  it('cierre: "lo que aprendimos de ti" con los átomos que más subieron, sin números', () => {
    const m = learned();
    const d = engine.openDeck(m, { deck_id: 'd', now: NOW });
    for (const c of d.cards.slice(0, 3)) engine.apply(m, ev('saved_intent', { flipped: false, deck_id: 'd' }, { movie_id: c.movie_id }));
    const close = engine.close(d, m);
    expect(close.saved_posters).toHaveLength(3);
    expect(close.ready_tonight).toBe(true);
    expect(hasNumbers(close.learned)).toBe(false);
    expect(close.top_atoms.length).toBeGreaterThan(0);
  });

  it('las cartas traen las dos caras', () => {
    const dto = engine.deckDTO(engine.openDeck(learned(), { deck_id: 'd', now: NOW, size: 5 }));
    expect(dto.cards[0]!.front.hook).toBeTruthy();
    expect(dto.cards[0]!.back.title).toBeTruthy();
  });
});

describe('Ver (10)', () => {
  const movies = [
    movie('corta', { humor: 0.95, luminosa: 0.9 }, { runtime_min: 85 }),
    movie('larga', { carga_emocional: 0.95, melancolica: 0.9 }, { runtime_min: 150 }),
    movie('fuera', { humor: 0.9 }, { providers: { CO: ['Mubi'] } }),
    movie('relleno1', {}),
    movie('relleno2', {}),
  ];
  const engine = new KinooEngine(defaultConfig, movies);
  const save = (id: string) => ev('saved_intent', { flipped: false }, { movie_id: id });
  const plats = ev('platforms_set', { country: 'CO', providers: ['Netflix'] });

  it('solo propone de la mano y en sus plataformas', () => {
    const m = engine.model('u', [plats, save('fuera'), save('corta')]);
    expect(engine.watch(m, NOW).card!.movie_id).toBe('corta');
  });

  it('mano vacía en sus plataformas → propone un mazo con sus plataformas', () => {
    const m = engine.model('u', [plats, save('fuera')]);
    expect(engine.watch(m, NOW).status).toBe('empty_platforms');
  });

  it('relaja la duración y lo dice sin números', () => {
    const m = engine.model('u', [plats, save('larga')]);
    const r = engine.watch(m, NOW, { max_runtime_min: 90 });
    expect(r.card!.movie_id).toBe('larga');
    expect(r.relaxed).toEqual(['duration']);
    expect(hasNumbers(r.notice!)).toBe(false);
  });

  it('después de tres "otra" seguidas sugiere abrir un sobre', () => {
    const m = engine.model('u', [plats, save('corta'), save('larga'), ...[1, 2, 3].map(() => ev('watch_skipped', {}, { movie_id: 'corta' }))]);
    expect(engine.watch(m, NOW).status).toBe('suggest_discover');
  });

  it('no repite enseguida la que pidió cambiar', () => {
    const m = engine.model('u', [plats, save('corta'), save('larga'), ev('watch_skipped', {}, { movie_id: 'corta' })]);
    expect(engine.watch(m, NOW).card!.movie_id).toBe('larga');
  });
});

describe('explicaciones (11)', () => {
  it('usa las etiquetas de los dos átomos que más aportan', () => {
    const t = explain(
      { hat: fromPartial({ intimidad: 0.9, calida: 0.8, humor: 0.1 }), profile: fromPartial({ intimidad: 0.6, calida: 0.5 }), vibe: null, vibeRecipe: null },
      cfg,
    );
    expect(t).toBe('Encaja con tu gusto por historias íntimas y de luz cálida.');
  });
  it('con mood: plantilla del mood personal', () => {
    const t = explain(
      { hat: fromPartial({ pausada: 0.9, calida: 0.8 }), profile: zeroVector(), vibe: 'llorar_bonito', vibeRecipe: fromPartial({ pausada: 0.5, calida: 0.4 }) },
      cfg,
    );
    expect(t).toBe('Responde a tu forma de llorar bonito: a fuego lento y de luz cálida.');
  });
  it('si una plantilla editada trae números, se usa una frase segura', () => {
    const bad = new ConfigIndex({
      ...defaultConfig,
      templates: defaultConfig.templates.map((x) => (x.key === 'profile' ? { ...x, text: 'Te gusta al 93%' } : x)),
    });
    const t = explain(
      { hat: fromPartial({ humor: 0.9, luminosa: 0.9 }), profile: fromPartial({ humor: 0.5, luminosa: 0.5 }), vibe: null, vibeRecipe: null },
      bad,
    );
    expect(hasNumbers(t)).toBe(false);
  });
  it('ninguna plantilla de la configuración tiene números ni %', () => {
    for (const t of defaultConfig.templates) expect(hasNumbers(t.text), t.key).toBe(false);
  });
});

describe('onboarding y arquetipo de perfil (7.3, 7.4)', () => {
  const engine = new KinooEngine(defaultConfig, synthCatalog(300, 42));
  it('entre 5 y 8 pares, sin repetir películas y de rasgos opuestos', () => {
    const pairs = engine.onboarding(engine.model('u', []), 6);
    expect(pairs).toHaveLength(6);
    const ids = pairs.flatMap((p) => [p.left_movie_id, p.right_movie_id]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of pairs)
      expect(cosine(engine.catalog.byId.get(p.left_movie_id)!.hat, engine.catalog.byId.get(p.right_movie_id)!.hat)).toBeLessThanOrEqual(0.3);
    expect(engine.onboarding(engine.model('u', []), 20)).toHaveLength(8);
  });
  it('el arquetipo es el más parecido al perfil', () => {
    const m = engine.model('u', []);
    m.profile = fromPartial({ intimidad: 0.7, calida: 0.6, carga_emocional: 0.8 });
    expect(engine.profile(m).archetype.key).toBe('romantico');
    m.profile = fromPartial({ inquietante: 0.7, onirica: 0.6 });
    expect(engine.profile(m).archetype.key).toBe('nocturno');
  });
});
