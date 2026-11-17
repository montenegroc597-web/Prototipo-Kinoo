import { defaultConfig } from '@kinoo/config';
import { KinooService, type UserSnapshot } from '@kinoo/core';
import { type ActiveDeck, KinooEngine, cosine, explain, inHand, paletteFor, runtimeText, toCardDTO } from '@kinoo/engine';
// Modo demo de Kinoo: el motor v2 corre en el navegador. Lo cargan las pantallas del prototipo
// (../_kinoo/kinoo-demo.js) y queda en window.KinooDemo. Si este archivo no carga, las pantallas
// usan sus datos de ejemplo de siempre.
import {
  type BillboardDTO,
  type CardDTO,
  type DeckClosingDTO,
  type EventInput,
  type InsightDTO,
  type KinooEvent,
  type MoodDTO,
  type Movie,
  type ShelfItemDTO,
  fitText,
  posterUrl,
} from '@kinoo/shared';
import pilot from '../../../packages/catalog/data/movies.pilot.json';
import type { KinooAdapter } from './adapter';
import { getSession, loginUrl, logout } from './session';

// Sin sesión no hay demo: se pide el mini inicio de sesión y se vuelve a esta pantalla.
const session = getSession();
if (!session && typeof location !== 'undefined') location.replace(loginUrl());
const USER_ID = session?.user_id ?? 'anonimo';
// Cada cuenta guarda su propio historial en este navegador.
const KEY = `kinoo.demo.v2:${USER_ID}`;
interface DemoState extends UserSnapshot {
  watching_movie_id?: string | null;
  last_closing?: DeckClosingDTO | null;
  /** Última película que salió a ver (para Abriendo y Gracias). */
  last_watch?: { movie_id: string; provider: string | null; rating: string | null; version: string | null } | null;
}

const catalog = pilot as unknown as {
  source: string;
  movies: Movie[];
  team_deck: { uuid: string; owner_name: string; title: string; movie_ids: string[]; notes?: Record<string, string> };
};
const team = catalog.team_deck;
// Las pantallas viven en kinoo-flujo/: los pósters locales (posters/<id>.jpg) quedan un nivel arriba.
const ASSET_BASE = '../';
const engine = new KinooEngine(defaultConfig, catalog.movies, {
  assetBaseUrl: ASSET_BASE,
  curatedDecks: team
    ? [
        {
          id: team.uuid,
          owner_kind: 'system',
          owner_id: 'equipo-kinoo',
          owner_name: team.owner_name,
          title: team.title,
          movie_ids: team.movie_ids,
          notes: team.notes,
        },
      ]
    : [],
});

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as DemoState;
      // Descarta eventos de películas que ya no están en el catálogo.
      s.events = s.events.filter((e) => !e.movie_id || engine.catalog.byId.has(e.movie_id));
      return s;
    }
  } catch {
    /* almacenamiento bloqueado: se trabaja en memoria */
  }
  return { user_id: USER_ID, events: [], active_deck: null };
}
let state = load();
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sin persistencia */
  }
}

/** Corre una operación del servicio y guarda lo nuevo (lo mismo que hace la Edge Function). */
function run<T>(fn: (svc: KinooService) => T): T {
  const svc = new KinooService(engine, state);
  const out = fn(svc);
  save();
  return out;
}

const vibeOf = (k: string | null | undefined) => (k && k !== 'todas' ? engine.cfg.vibeKey(k) : null);
const fmtDur = runtimeText;
const movieOf = (id: string) => engine.catalog.byId.get(id)!;

// El prototipo tiene cuatro tonos con ilustración propia; se elige el más cercano según los átomos.
function toneKey(m: Movie): 'melancólico' | 'nostálgico' | 'oscuro' | 'cálido' {
  const a = m.atoms;
  const c = {
    melancólico: a.melancolica,
    oscuro: Math.max(a.sombria, a.inquietante),
    cálido: Math.max(a.reconfortante, a.luminosa),
    nostálgico: (a.calida + a.melancolica) / 2 - 0.1,
  };
  return Object.entries(c).sort((x, y) => y[1] - x[1])[0]![0] as 'melancólico';
}
const KICKER: Record<string, string> = { afin: 'muy tú', creador: 'del equipo Kinoo', comodin: 'un giro para ti', sorpresa: 'una sorpresa' };

const P = engine.cfg.params;

/** Tamaño del título de Ver: una sola línea (46 px los cortos; 34 y 28 px los largos). */
export function watchTitleSize(title: string): number {
  const n = title.length;
  return n <= 14 ? 46 : n <= 18 ? 34 : 28;
}

/** Tamaño del título del reverso según su largo (el estándar card_title_max garantiza que el más largo quepa a 26 px). */
export function titleSize(title: string): number {
  const n = title.length;
  return n <= 12 ? 40 : n <= 15 ? 38 : n <= 18 ? 34 : n <= 21 ? 30 : 26;
}

/** Carta del motor → formato de carta del prototipo (Flujo1_Descubrir). */
function toProtoCard(c: CardDTO) {
  const m = movieOf(c.movie_id).movie;
  const tono = toneKey(m);
  const provs = c.back.providers;
  return {
    movie_id: m.id,
    role: c.role,
    kicker: KICKER[c.role] ?? 'para ti',
    premise: c.display.premise,
    match: '',
    showMatch: false,
    tags: m.genres.slice(0, 3),
    similar: c.display.explanation,
    title: c.display.title,
    titleSize: titleSize(c.display.title),
    subtitle: c.display.subtitle,
    dur: fmtDur(m.runtime_min),
    genre: m.genres[0] ?? '',
    year: String(m.year),
    desc: c.display.overview,
    img: c.back.poster_url ?? undefined,
    // Los pósters son verticales y el espacio de la carta es horizontal: se muestra la parte de arriba (caras y título).
    pos: '50% 22%',
    netflix: provs.includes('Netflix'),
    disney: provs.includes('Disney+'),
    tono,
    rows: [
      ['ritmo', c.display.pillars.ritmo, 'ritmo de la película'],
      ['tono', tono, c.display.pillars.tono],
      ['historia', c.display.pillars.historia, 'de qué va'],
      ['visual', c.display.pillars.visual, 'cómo se ve'],
    ],
  };
}

function protoAdn(c: CardDTO) {
  const im = movieOf(c.movie_id);
  const sims = engine.catalog.list
    .filter((x) => x.movie.id !== im.movie.id)
    .map((x) => [x, cosine(x.hat, im.hat)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return {
    // ADN de la película (no de la persona), con el estándar de caracteres de la ficha.
    phrase: c.display.dna_phrase,
    themes: c.display.themes,
    sim: sims.map(([x]) => [fitText(x.movie.title, P.card_similar_title_max), String(x.movie.year)]),
  };
}

// El mazo que está mostrando esta pantalla. Aunque se complete, se sigue mostrando (pantalla de cierre)
// hasta que la persona sale del mazo; recién entonces el próximo Descubrir abre uno nuevo.
let pinned: string | null = null;
let cache: { id: string; cards: ReturnType<typeof toProtoCard>[]; adn: ReturnType<typeof protoAdn>[] } | null = null;
function ensureDeck(): ActiveDeck {
  const d = state.active_deck;
  if (d && (!d.completed_at || d.deck_id === pinned)) {
    pinned = d.deck_id;
    return d;
  }
  run((svc) => svc.openDeck({ size: 10 }));
  pinned = state.active_deck!.deck_id;
  return state.active_deck!;
}
// Auditoría de textos (solo pruebas): ?auditoria=id1,id2… muestra esas películas como mazo, sin guardar nada.
const AUDIT_IDS = (() => {
  try {
    const q = new URLSearchParams(location.search).get('auditoria');
    return q ? q.split(',').filter((id) => engine.catalog.byId.has(id)) : null;
  } catch {
    return null;
  }
})();

function auditView() {
  const cards = AUDIT_IDS!.map((id, i) => {
    const m = engine.catalog.byId.get(id)!;
    // Peor caso de la explicación: el perfil igual a la película (dos rasgos con etiqueta larga).
    const explanation = explain({ hat: m.hat, profile: m.hat, vibe: null, vibeRecipe: null }, engine.cfg);
    return toCardDTO(m, { slot: i + 1, role: 'afin', explanation, special_treatment: false }, { country: 'CO', assetBaseUrl: ASSET_BASE });
  });
  return { id: 'auditoria', cards: cards.map(toProtoCard), adn: cards.map(protoAdn) };
}

function deckView() {
  if (AUDIT_IDS) return (cache ??= auditView());
  const d = ensureDeck();
  if (!cache || cache.id !== d.deck_id) {
    const cards = engine.deckDTO(d).cards;
    cache = { id: d.deck_id, cards: cards.map(toProtoCard), adn: cards.map(protoAdn) };
  }
  return cache;
}

const ACTIONS: Record<string, 'saved_intent' | 'dismissed' | 'marked_seen'> = { want: 'saved_intent', pass: 'dismissed', seen: 'marked_seen' };

const api = {
  version: '2.0.0',
  mode: 'demo' as const,
  source: catalog.source,

  // ---- Descubrir ----
  /** Cartas del mazo abierto (o de uno nuevo), en el formato del prototipo. */
  discoverCards() {
    return deckView().cards;
  },
  discoverAdn() {
    return deckView().adn;
  },
  /** El prototipo informa una acción sobre la carta idx. El gesto lo decide el front. */
  onCard(idx: number, kind: 'want' | 'pass' | 'seen', flipped: boolean) {
    if (AUDIT_IDS) return null;
    const d = ensureDeck();
    const card = d.cards[idx];
    const type = ACTIONS[kind];
    if (!card || !type) return null;
    const events: EventInput[] = [
      {
        type,
        movie_id: card.movie_id,
        payload: { flipped, vibe: d.vibe, deck_id: d.deck_id, slot: card.slot },
        context: { surface: 'discover', vibe: d.vibe },
      } as EventInput,
    ];
    if (idx === d.cards.length - 1) events.push({ type: 'deck_completed', payload: { deck_id: d.deck_id }, context: { surface: 'discover' } } as EventInput);
    const r = run((svc) => svc.postEvents(events));
    const closing = r.results.find((x) => x.closing)?.closing;
    if (closing) {
      state.last_closing = closing;
      save();
    }
    return { special_match: !!r.results.find((x) => x.save)?.save?.special_match, closing: closing ?? null };
  },
  onFlip(idx: number) {
    if (AUDIT_IDS) return;
    const d = ensureDeck();
    const card = d.cards[idx];
    if (card)
      run((svc) =>
        svc.postEvents([{ type: 'card_flipped', payload: { deck_id: d.deck_id, slot: card.slot }, context: { surface: 'discover' } } as EventInput]),
      );
  },
  /** Al salir del mazo: si quedó a medias, se cierra; el próximo Descubrir abre uno nuevo. */
  leaveDeck() {
    if (AUDIT_IDS) return;
    const d = state.active_deck;
    if (d && !d.completed_at) run((svc) => svc.postEvents([{ type: 'deck_completed', payload: { deck_id: d.deck_id } } as EventInput]));
    pinned = null;
  },
  /** Frase del cierre del mazo, con el estándar de caracteres (la usa la pantalla de fin del mazo). */
  closingLine(): string | null {
    const c = state.last_closing;
    return c?.learned ? fitText(c.learned, P.closing_text_max) : null;
  },
  /** Cierre del último mazo terminado: frase, pósters guardados, conteos (quieres ver / ya la viste / dejaste pasar) y mood del mazo. */
  lastClosing(): DeckClosingDTO | null {
    return state.last_closing ?? null;
  },

  // ---- Ver ----
  /** Películas de la mano en el formato FILMS del prototipo (FlujoV1_Feed). null si la mano está vacía. */
  watchFilms(): Record<string, unknown> | null {
    const model = engine.model(state.user_id, state.events);
    const hand = [...model.states.values()].filter((s) => inHand(s) && engine.catalog.byId.has(s.movie_id));
    if (!hand.length) return null;
    const out: Record<string, unknown> = {};
    hand.forEach((s) => {
      const im = movieOf(s.movie_id);
      const m = im.movie;
      const img = posterUrl(m.poster_path, { assetBaseUrl: ASSET_BASE }) ?? undefined;
      out[m.id] = {
        t: fitText(m.title, P.watch_title_max),
        tsize: watchTitleSize(fitText(m.title, P.watch_title_max)),
        dur: fmtDur(m.runtime_min),
        dir: m.directors.length > 1 ? `${m.directors[0]} y otros` : (m.directors[0] ?? ''),
        ...(img ? { img } : { pal: paletteFor(im, engine.cfg) }),
        match: 0,
        g: m.genres,
        e: `${Math.floor(m.year / 10) * 10}s`,
        du: m.runtime_min < 100 ? 0 : m.runtime_min < 140 ? 1 : 2,
        to: [toneKey(m)],
        // Solo las plataformas reales de la película (sin inventar una si no tiene).
        plat: (m.providers.CO ?? []).filter((p) => ['Netflix', 'Prime Video', 'Max', 'Apple TV'].includes(p)),
        why: '',
      };
    });
    return out;
  },
  /** Orden de Ver para un mood del prototipo: primero la propuesta del motor, luego el resto de la mano. */
  watchQueue(moodKey: string | null) {
    const films = api.watchFilms();
    if (!films) return null;
    const vibe = vibeOf(moodKey);
    // Copia de la foto: proponer no debe dejar eventos de prueba por cada orden calculado.
    const tmp: DemoState = JSON.parse(JSON.stringify(state));
    const ids: string[] = [];
    const whys: Record<string, string> = {};
    for (let i = 0; i < Object.keys(films).length; i++) {
      const svc = new KinooService(engine, tmp);
      svc.userModel.watch_skips_in_row = 0;
      for (const id of ids) svc.userModel.watch_skipped_ids.add(id);
      const p = svc.watchProposal(vibe ? { vibe } : {});
      if (!p.card || ids.includes(p.card.movie_id)) break;
      ids.push(p.card.movie_id);
      const why = fitText(p.card.explanation, P.watch_why_max);
      whys[p.card.movie_id] = why.charAt(0).toLowerCase() + why.slice(1);
    }
    for (const id of Object.keys(films)) {
      if (!ids.includes(id)) ids.push(id);
      (films[id] as { why: string }).why = whys[id] ?? 'está en tu mano.';
    }
    return { films, ids };
  },
  onWatch(movieId: string, action: 'skip' | 'start', provider?: string) {
    if (!engine.catalog.byId.has(movieId)) return;
    if (action === 'skip')
      run((svc) => svc.postEvents([{ type: 'watch_skipped', movie_id: movieId, payload: {}, context: { surface: 'watch' } } as EventInput]));
    if (action === 'start') {
      run((svc) =>
        svc.postEvents([{ type: 'watch_started', movie_id: movieId, payload: provider ? { provider } : {}, context: { surface: 'watch' } } as EventInput]),
      );
      state.watching_movie_id = movieId;
      state.last_watch = { movie_id: movieId, provider: provider ?? null, rating: null, version: null };
      save();
    }
  },
  /**
   * Calificar (FlujoV4): niveles del prototipo 0 a 4 → reacción del motor. 0 = "Me dormí" (cuenta como not_for_me, ver P9.1).
   * version: la frase de "¿Qué versión de ti salió?" (opcional). Por ahora solo se guarda para la pantalla de Gracias (P9.2 sin decidir).
   */
  confirmWatch(level: number, version?: string | null) {
    const id = state.watching_movie_id;
    if (!id) return false;
    const reaction = level >= 3 ? 'loved' : level === 2 ? 'liked' : 'not_for_me';
    run((svc) =>
      svc.postEvents([
        {
          type: 'watch_confirmed',
          movie_id: id,
          payload: { reaction, rewatch: level === 4, ...(level <= 0 ? { fell_asleep: true } : {}) },
          context: { surface: 'watch' },
        } as EventInput,
      ]),
    );
    state.watching_movie_id = null;
    const rating = run((svc) => svc.shelf()).find((x) => x.id === id)?.rating ?? null;
    state.last_watch = { movie_id: id, provider: state.last_watch?.movie_id === id ? state.last_watch.provider : null, rating, version: version ?? null };
    save();
    return true;
  },
  /** Lo último que salió a ver: plataforma elegida y, si ya calificó, su calificación en palabras. null si nunca salió a ver nada. */
  lastWatch(): { movie_id: string; title: string; provider: string | null; rating: string | null; version: string | null } | null {
    const w = state.last_watch;
    if (!w || !engine.catalog.byId.has(w.movie_id)) return null;
    return { ...w, title: fitText(movieOf(w.movie_id).movie.title, P.watch_title_max) };
  },

  /**
   * Cartelera de Ver para un mood ("todas" o null = sin mood), en el orden del motor. Lo calificado ya no está: pasó a la repisa.
   * Pasar de carta no es una señal: solo un botón "otra" explícito debería llamar onWatch(id, 'skip').
   */
  billboard(moodKey: string | null): BillboardDTO {
    return run((svc) => svc.billboard(moodKey));
  },
  /** Selector de mood de Ver: "todas" primero. */
  moods(): MoodDTO[] {
    return run((svc) => svc.moods());
  },
  /** Repisa de Ver: lo que ya vio y calificó, lo más reciente primero. */
  shelf(): ShelfItemDTO[] {
    return run((svc) => svc.shelf());
  },
  /** Estrella (super like): on = true guarda un super_liked; on = false deshace esa estrella con un undo. Devuelve cómo quedó. */
  star(movieId: string, on: boolean): { starred: boolean } {
    if (!engine.catalog.byId.has(movieId)) return { starred: false };
    return run((svc) => {
      const st = svc.userModel.states.get(movieId);
      if (on && !st?.starred) svc.postEvents([{ type: 'super_liked', movie_id: movieId, payload: {}, context: { surface: 'watch' } } as EventInput]);
      if (!on && st?.starred && st.star_event_id)
        svc.postEvents([{ type: 'undo', payload: { undone_event_id: st.star_event_id }, context: { surface: 'watch' } } as EventInput]);
      return { starred: !!svc.userModel.states.get(movieId)?.starred };
    });
  },
  /** "Volver a verla" desde la repisa: rewatch_intent la devuelve a la cartelera. */
  rewatch(movieId: string): void {
    if (!engine.catalog.byId.has(movieId)) return;
    run((svc) => svc.postEvents([{ type: 'rewatch_intent', movie_id: movieId, payload: {}, context: { surface: 'watch' } } as EventInput]));
  },

  // ---- Utilidades ----
  /** "Lo que el mazo dice de ti" (Resumen, Perfil y Ver), en palabras. */
  insight(): InsightDTO {
    return run((svc) => svc.insight());
  },
  profile() {
    return run((svc) => svc.profile());
  },
  events(): KinooEvent[] {
    return state.events;
  },
  reset() {
    state = { user_id: USER_ID, events: [], active_deck: null, last_watch: null };
    pinned = null;
    cache = null;
    save();
  },
  /** Quién está usando la demo. */
  session() {
    return session;
  },
  /** Cerrar sesión y volver al inicio de sesión. */
  logout() {
    logout();
    location.assign(loginUrl());
  },
  /** El mismo contrato que el modo Supabase, por si una pantalla nueva lo quiere usar. */
  adapter: {
    mode: 'demo',
    postEvents: async (events) => run((svc) => svc.postEvents(events)),
    currentDeck: async () => run((svc) => svc.currentDeck()),
    openDeck: async (o) => run((svc) => svc.openDeck(o)),
    watchProposal: async (f) => run((svc) => svc.watchProposal(f)),
    onboarding: async (b) => run((svc) => svc.onboarding(b as never)),
    profile: async () => run((svc) => svc.profile()),
    insight: async () => run((svc) => svc.insight()),
    moods: async () => run((svc) => svc.moods()),
    billboard: async (v) => run((svc) => svc.billboard(v)),
    shelf: async () => run((svc) => svc.shelf()),
  } as KinooAdapter,
};

declare global {
  interface Window {
    KinooDemo?: typeof api;
  }
}
window.KinooDemo = api;

// Atribución que exige TMDB cuando el catálogo viene de su API (la semilla manual no la necesita).
if (catalog.source === 'tmdb' && typeof document !== 'undefined') {
  const add = () => {
    const n = document.createElement('p');
    n.textContent = 'Datos de películas: TMDB. Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica. Plataformas: JustWatch.';
    n.setAttribute(
      'style',
      'position:fixed;left:0;right:0;bottom:0;margin:0;padding:2px 8px;font:500 9px/12px system-ui,sans-serif;color:#8e6f62;text-align:center;pointer-events:none;z-index:9999',
    );
    document.body.appendChild(n);
  };
  if (document.body) add();
  else document.addEventListener('DOMContentLoaded', add);
}
