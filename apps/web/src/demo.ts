// Modo demo de Kinoo: el motor v2 corre en el navegador. Lo cargan las pantallas del prototipo
// (../_kinoo/kinoo-demo.js) y queda en window.KinooDemo. Si este archivo no carga, las pantallas
// usan sus datos de ejemplo de siempre.
import type { CardDTO, EventInput, KinooEvent, Movie } from '@kinoo/shared';
import { KinooEngine, cosine, topAtoms, type ActiveDeck } from '@kinoo/engine';
import { KinooService, type UserSnapshot } from '@kinoo/api';
import { defaultConfig } from '../../../data/config';
import pilot from '../../../data/catalog/movies.pilot.json';
import type { KinooAdapter } from './adapter';

const KEY = 'kinoo.demo.v2';
interface DemoState extends UserSnapshot { watching_movie_id?: string | null; last_closing?: unknown }

const catalog = pilot as unknown as { source: string; movies: Movie[]; team_deck: { uuid: string; owner_name: string; title: string; movie_ids: string[]; notes?: Record<string, string> } };
const team = catalog.team_deck;
const engine = new KinooEngine(defaultConfig, catalog.movies, {
  curatedDecks: team ? [{ id: team.uuid, owner_kind: 'system', owner_id: 'equipo-kinoo', owner_name: team.owner_name, title: team.title, movie_ids: team.movie_ids, notes: team.notes }] : [],
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
  } catch { /* almacenamiento bloqueado: se trabaja en memoria */ }
  return { user_id: 'demo', events: [], active_deck: null };
}
let state = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin persistencia */ } }

/** Corre una operación del servicio y guarda lo nuevo (lo mismo que hace la Edge Function). */
function run<T>(fn: (svc: KinooService) => T): T {
  const svc = new KinooService(engine, state);
  const out = fn(svc);
  save();
  return out;
}

const vibeOf = (k: string | null | undefined) => (k && k !== 'todas' ? engine.cfg.vibeKey(k) : null);
const fmtDur = (min: number) => `${Math.floor(min / 60)} h ${min % 60}`;
const movieOf = (id: string) => engine.catalog.byId.get(id)!;
const PALS = [['#2c3b52', '#0f1320', '#f2b544'], ['#6b2a6e', '#1d0f24', '#f2b544'], ['#4a4f52', '#16191b', '#d9c7a8'], ['#d9772e', '#4a1a08', '#f4e7d0']];

// El prototipo tiene cuatro tonos con ilustración propia; se elige el más cercano según los átomos.
function toneKey(m: Movie): 'melancólico' | 'nostálgico' | 'oscuro' | 'cálido' {
  const a = m.atoms;
  const c = { 'melancólico': a.melancolica, 'oscuro': Math.max(a.sombria, a.inquietante), 'cálido': Math.max(a.reconfortante, a.luminosa), 'nostálgico': (a.calida + a.melancolica) / 2 - 0.1 };
  return (Object.entries(c).sort((x, y) => y[1] - x[1])[0]![0]) as 'melancólico';
}
/**
 * La carta del prototipo está diseñada para una premisa corta (unas 40 letras) y el juez escribe frases de hasta 160.
 * Para la demo se toma la primera parte de la frase (hasta una coma) y, si sigue larga, se corta en una palabra con "…".
 * Decisión pendiente para Camilo: pedirle al juez una premisa corta aparte o ajustar el diseño de la carta.
 */
export function shortPremise(hook: string, max = 44): string {
  const sentence = hook.charAt(0) + hook.slice(1).toLowerCase();
  const parts = sentence.split(/,\s+|\s+—\s+|;\s+/);
  let out = parts[0]!;
  for (let i = 1; i < parts.length && out.length < 24 && out.length + parts[i]!.length + 2 <= max; i++) out += ', ' + parts[i];
  if (out.length > max) out = out.slice(0, out.lastIndexOf(' ', max - 1)) + '…';
  else if (out.length < sentence.length) out = out.replace(/[.,;:]?$/, '…');
  return out;
}

const KICKER: Record<string, string> = { afin: 'muy tú', creador: 'del equipo Kinoo', comodin: 'un giro para ti', sorpresa: 'una sorpresa' };

/** Carta del motor → formato de carta del prototipo (Flujo1_Descubrir). */
function toProtoCard(c: CardDTO) {
  const m = movieOf(c.movie_id).movie;
  const tono = toneKey(m);
  const provs = c.back.providers;
  return {
    movie_id: m.id, role: c.role,
    kicker: KICKER[c.role] ?? 'para ti', premise: shortPremise(c.front.hook),
    match: '', showMatch: false, tags: m.genres.slice(0, 3), similar: c.explanation,
    title: m.title, subtitle: `Una película de ${m.directors.join(' y ')}`, dur: fmtDur(m.runtime_min), genre: m.genres[0] ?? '', year: String(m.year),
    desc: m.overview || c.front.hook.charAt(0) + c.front.hook.slice(1).toLowerCase(),
    img: m.poster_path && m.poster_path.startsWith('_blob/') ? m.poster_path : undefined, pos: '50% 50%',
    netflix: provs.includes('Netflix'), disney: provs.includes('Disney+'), tono,
    rows: [['ritmo', m.pillars.ritmo, 'ritmo de la película'], ['tono', tono, m.pillars.tono], ['historia', m.pillars.historia, 'de qué va'], ['visual', m.pillars.visual, 'cómo se ve']],
  };
}

function protoAdn(c: CardDTO) {
  const im = movieOf(c.movie_id);
  const sims = engine.catalog.list.filter((x) => x.movie.id !== im.movie.id).map((x) => [x, cosine(x.hat, im.hat)] as const).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return {
    phrase: c.explanation,
    themes: topAtoms(im.hat, 3, { positiveOnly: true }).map((k) => { const l = engine.cfg.label(k); return l.charAt(0).toUpperCase() + l.slice(1); }),
    sim: sims.map(([x]) => [x.movie.title, String(x.movie.year)]),
  };
}

// El mazo que está mostrando esta pantalla. Aunque se complete, se sigue mostrando (pantalla de cierre)
// hasta que la persona sale del mazo; recién entonces el próximo Descubrir abre uno nuevo.
let pinned: string | null = null;
let cache: { id: string; cards: ReturnType<typeof toProtoCard>[]; adn: ReturnType<typeof protoAdn>[] } | null = null;
function ensureDeck(): ActiveDeck {
  const d = state.active_deck;
  if (d && (!d.completed_at || d.deck_id === pinned)) { pinned = d.deck_id; return d; }
  run((svc) => svc.openDeck({ size: 10 }));
  pinned = state.active_deck!.deck_id;
  return state.active_deck!;
}
function deckView() {
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
  discoverCards() { return deckView().cards; },
  discoverAdn() { return deckView().adn; },
  /** El prototipo informa una acción sobre la carta idx. El gesto lo decide el front. */
  onCard(idx: number, kind: 'want' | 'pass' | 'seen', flipped: boolean) {
    const d = ensureDeck();
    const card = d.cards[idx];
    const type = ACTIONS[kind];
    if (!card || !type) return null;
    const events: EventInput[] = [{ type, movie_id: card.movie_id, payload: { flipped, vibe: d.vibe, deck_id: d.deck_id, slot: card.slot }, context: { surface: 'discover', vibe: d.vibe } } as EventInput];
    if (idx === d.cards.length - 1) events.push({ type: 'deck_completed', payload: { deck_id: d.deck_id }, context: { surface: 'discover' } } as EventInput);
    const r = run((svc) => svc.postEvents(events));
    const closing = r.results.find((x) => x.closing)?.closing;
    if (closing) { state.last_closing = closing; save(); }
    return { special_match: !!r.results.find((x) => x.save)?.save?.special_match, closing: closing ?? null };
  },
  onFlip(idx: number) {
    const d = ensureDeck();
    const card = d.cards[idx];
    if (card) run((svc) => svc.postEvents([{ type: 'card_flipped', payload: { deck_id: d.deck_id, slot: card.slot }, context: { surface: 'discover' } } as EventInput]));
  },
  /** Al salir del mazo: si quedó a medias, se cierra; el próximo Descubrir abre uno nuevo. */
  leaveDeck() {
    const d = state.active_deck;
    if (d && !d.completed_at) run((svc) => svc.postEvents([{ type: 'deck_completed', payload: { deck_id: d.deck_id } } as EventInput]));
    pinned = null;
  },
  lastClosing() { return state.last_closing ?? null; },

  // ---- Ver ----
  /** Películas de la mano en el formato FILMS del prototipo (FlujoV1_Feed). null si la mano está vacía. */
  watchFilms(): Record<string, unknown> | null {
    const model = engine.model(state.user_id, state.events);
    const hand = [...model.states.values()].filter((s) => s.state === 'saved' || s.state === 'rewatch');
    if (!hand.length) return null;
    const out: Record<string, unknown> = {};
    hand.forEach((s, i) => {
      const im = movieOf(s.movie_id), m = im.movie;
      const img = m.poster_path && m.poster_path.startsWith('_blob/') ? m.poster_path : undefined;
      out[m.id] = {
        t: m.title, dur: fmtDur(m.runtime_min), dir: m.directors.join(' y '), ...(img ? { img } : { pal: PALS[i % PALS.length] }), match: 0,
        g: m.genres, e: `${Math.floor(m.year / 10) * 10}s`, du: m.runtime_min < 100 ? 0 : m.runtime_min < 140 ? 1 : 2, to: [toneKey(m)],
        plat: (m.providers.CO ?? []).filter((p) => ['Netflix', 'Prime Video', 'Max', 'Apple TV'].includes(p)).concat((m.providers.CO ?? []).length ? [] : ['Netflix']),
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
      whys[p.card.movie_id] = p.card.explanation.charAt(0).toLowerCase() + p.card.explanation.slice(1);
    }
    for (const id of Object.keys(films)) { if (!ids.includes(id)) ids.push(id); (films[id] as { why: string }).why = whys[id] ?? 'está en tu mano.'; }
    return { films, ids };
  },
  onWatch(movieId: string, action: 'skip' | 'start', provider?: string) {
    if (!engine.catalog.byId.has(movieId)) return;
    if (action === 'skip') run((svc) => svc.postEvents([{ type: 'watch_skipped', movie_id: movieId, payload: {}, context: { surface: 'watch' } } as EventInput]));
    if (action === 'start') {
      run((svc) => svc.postEvents([{ type: 'watch_started', movie_id: movieId, payload: { provider: provider ?? 'Netflix' }, context: { surface: 'watch' } } as EventInput]));
      state.watching_movie_id = movieId; save();
    }
  },
  /** Calificar (FlujoV4): niveles del prototipo 0 a 4 → reacción del motor. */
  confirmWatch(level: number) {
    const id = state.watching_movie_id;
    if (!id) return false;
    const reaction = level >= 3 ? 'loved' : level === 2 ? 'liked' : 'not_for_me';
    run((svc) => svc.postEvents([{ type: 'watch_confirmed', movie_id: id, payload: { reaction, rewatch: level === 4 }, context: { surface: 'watch' } } as EventInput]));
    state.watching_movie_id = null; save();
    return true;
  },

  // ---- Utilidades ----
  profile() { return run((svc) => svc.profile()); },
  events(): KinooEvent[] { return state.events; },
  reset() { state = { user_id: 'demo', events: [], active_deck: null }; pinned = null; cache = null; save(); },
  /** El mismo contrato que el modo Supabase, por si una pantalla nueva lo quiere usar. */
  adapter: {
    mode: 'demo',
    postEvents: async (events) => run((svc) => svc.postEvents(events)),
    currentDeck: async () => run((svc) => svc.currentDeck()),
    openDeck: async (o) => run((svc) => svc.openDeck(o)),
    watchProposal: async (f) => run((svc) => svc.watchProposal(f)),
    onboarding: async (b) => run((svc) => svc.onboarding(b as never)),
  } as KinooAdapter,
};

declare global { interface Window { KinooDemo?: typeof api } }
window.KinooDemo = api;

// Atribución que exige TMDB cuando el catálogo viene de su API (la semilla manual no la necesita).
if (catalog.source === 'tmdb' && typeof document !== 'undefined') {
  const add = () => {
    const n = document.createElement('p');
    n.textContent = 'Datos de películas: TMDB. Este producto usa la API de TMDB, pero TMDB no lo respalda ni lo certifica. Plataformas: JustWatch.';
    n.setAttribute('style', 'position:fixed;left:0;right:0;bottom:0;margin:0;padding:2px 8px;font:500 9px/12px system-ui,sans-serif;color:#8e6f62;text-align:center;pointer-events:none;z-index:9999');
    document.body.appendChild(n);
  };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
}
