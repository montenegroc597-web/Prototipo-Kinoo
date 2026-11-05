import type { AtomVector, KinooEvent } from '@kinoo/shared';
import type { Catalog } from './catalog';
import type { ConfigIndex } from './configIndex';
import { applySignal, signalsOf } from './learning';
import { fromPartial, zeroVector } from './vector';

export type MovieMark = 'saved' | 'seen' | 'rewatch' | 'dismissed';

export interface MovieState {
  movie_id: string;
  state: MovieMark;
  special_match: boolean;
  saved_at?: string;
  updated_at: string;
}

export interface VibeRecipeState {
  recipe: AtomVector;
  seed_version: number;
  signal_count: number;
}

/** Todo lo que se deriva de los eventos de una persona. */
export interface UserModel {
  user_id: string;
  profile: AtomVector;
  signal_count: number;
  vibes: Record<string, VibeRecipeState>;
  states: Map<string, MovieState>;
  providers: { country: string; list: string[] } | null;
  /** Rechazos en Ver seguidos (se reinicia al aceptar o al salir a la plataforma). */
  watch_skips_in_row: number;
  /** Películas que pidió cambiar en Ver desde el último reinicio (no se vuelven a proponer enseguida). */
  watch_skipped_ids: Set<string>;
  /** Descartes recientes (para la fatiga de descarte: "hoy no" baja lo parecido por un tiempo). */
  recent_dismissals: Array<{ movie_id: string; at: string }>;
}

export function emptyModel(user_id: string): UserModel {
  return {
    user_id,
    profile: zeroVector(),
    signal_count: 0,
    vibes: {},
    states: new Map(),
    providers: null,
    watch_skips_in_row: 0,
    watch_skipped_ids: new Set(),
    recent_dismissals: [],
  };
}

/** El mood en el que ocurrió un evento: primero el del payload, luego el del contexto. */
export function eventVibe(e: KinooEvent, cfg: ConfigIndex): string | null {
  const p = e.payload as { vibe?: string | null };
  return cfg.vibeKey(p?.vibe ?? (e.context?.vibe as string | null | undefined) ?? null);
}

/** Copia la receta semilla a la receta personal la primera vez que alguien usa un mood. */
export function ensureVibe(model: UserModel, vibe: string, cfg: ConfigIndex): VibeRecipeState {
  let r = model.vibes[vibe];
  if (!r) {
    const def = cfg.vibes.get(vibe)!;
    r = { recipe: fromPartial(def.recipe), seed_version: def.version, signal_count: 0 };
    model.vibes[vibe] = r;
  }
  return r;
}

/** Aplica un evento al modelo (muta y devuelve el mismo objeto). */
export function applyEvent(model: UserModel, e: KinooEvent, catalog: Catalog, cfg: ConfigIndex): UserModel {
  const tau = cfg.params.distinct_threshold;
  const vibe = eventVibe(e, cfg);
  if (vibe) ensureVibe(model, vibe, cfg);
  for (const s of signalsOf(e, cfg)) {
    const m = catalog.byId.get(s.movie_id);
    if (!m) continue;
    model.profile = applySignal(model.profile, m.hat, s.signal, s.eta, tau);
    model.signal_count += 1;
    if (vibe) {
      const r = model.vibes[vibe]!;
      r.recipe = applySignal(r.recipe, m.hat, s.signal, s.eta, tau);
      r.signal_count += 1;
    }
  }
  updateState(model, e);
  return model;
}

function mark(model: UserModel, movie: string | undefined, state: MovieMark, at: string, extra: Partial<MovieState> = {}) {
  if (!movie) return;
  const prev = model.states.get(movie);
  model.states.set(movie, { movie_id: movie, special_match: prev?.special_match ?? false, saved_at: prev?.saved_at, ...extra, state, updated_at: at });
}

function resetSkips(model: UserModel) {
  model.watch_skips_in_row = 0;
  model.watch_skipped_ids.clear();
}

function updateState(model: UserModel, e: KinooEvent) {
  switch (e.type) {
    case 'saved_intent':
      mark(model, e.movie_id, 'saved', e.at, { saved_at: e.at, special_match: !!e.context?.special_match });
      break;
    case 'dismissed':
      mark(model, e.movie_id, 'dismissed', e.at);
      if (e.movie_id) {
        model.recent_dismissals.push({ movie_id: e.movie_id, at: e.at });
        if (model.recent_dismissals.length > 200) model.recent_dismissals.shift();
      }
      break;
    case 'marked_seen':
      mark(model, e.movie_id, 'seen', e.at);
      break;
    case 'rewatch_intent':
      mark(model, e.movie_id, 'rewatch', e.at);
      break;
    case 'watch_confirmed':
      mark(model, e.movie_id, e.payload.rewatch ? 'rewatch' : 'seen', e.at);
      resetSkips(model);
      break;
    case 'watch_skipped':
      model.watch_skips_in_row += 1;
      if (e.movie_id) model.watch_skipped_ids.add(e.movie_id);
      break;
    case 'watch_started':
      resetSkips(model);
      break;
    case 'deck_opened':
      resetSkips(model);
      break;
    case 'platforms_set':
      model.providers = { country: e.payload.country, list: [...e.payload.providers] };
      break;
    default:
      break;
  }
}

/**
 * Recalcula el modelo completo desde el historial (principio 3: el perfil es un cálculo).
 * Ordena por fecha y descarta los eventos deshechos con `undo`.
 */
export function replay(user_id: string, events: KinooEvent[], catalog: Catalog, cfg: ConfigIndex): UserModel {
  const sorted = [...events].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const undone = new Set<string>();
  // Un undo deshecho por otro undo vuelve a valer: se resuelve de atrás hacia adelante.
  for (let i = sorted.length - 1; i >= 0; i--) {
    const e = sorted[i]!;
    if (e.type === 'undo' && !undone.has(e.id)) undone.add(e.payload.undone_event_id);
  }
  const model = emptyModel(user_id);
  for (const e of sorted) {
    if (e.type === 'undo' || undone.has(e.id)) continue;
    applyEvent(model, e, catalog, cfg);
  }
  return model;
}
