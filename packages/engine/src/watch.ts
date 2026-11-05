import type { WatchFilters } from '@kinoo/shared';
import { availableOn } from './candidates';
import type { Catalog, IndexedMovie } from './catalog';
import type { ConfigIndex } from './configIndex';
import { vibeRecipeOf } from './deck';
import { explain } from './explain';
import type { UserModel } from './profile';
import { scoreMovie } from './score';
import { cosine } from './vector';

export type WatchStatus = 'proposal' | 'suggest_discover' | 'empty_platforms' | 'empty_hand';

export interface WatchDecision {
  status: WatchStatus;
  movie?: IndexedMovie;
  score?: number;
  explanation?: string;
  relaxed: Array<'duration' | 'vibe'>;
  notice?: string;
  filters: WatchFilters;
}

/** Ver (sección 10): una propuesta a la vez desde la mano. */
export function proposeWatch(input: { catalog: Catalog; model: UserModel; cfg: ConfigIndex; now: Date; filters?: WatchFilters }): WatchDecision {
  const { catalog, model, cfg, now } = input;
  const p = cfg.params;
  const filters: WatchFilters = { ...(input.filters ?? {}) };
  const vibe = cfg.vibeKey(filters.vibe ?? null);
  const base = { relaxed: [] as Array<'duration' | 'vibe'>, filters };

  // 5. Después de N "otra" seguidas, sugerir Descubrir.
  if (model.watch_skips_in_row >= p.watch_skip_limit) {
    return { ...base, status: 'suggest_discover', notice: cfg.template('watch_too_many_skips') };
  }

  // 1. Mano: solo ○ y ◉.
  const hand = [...model.states.values()]
    .filter((s) => s.state === 'saved' || s.state === 'rewatch')
    .map((s) => ({ st: s, m: catalog.byId.get(s.movie_id) }))
    .filter((x): x is { st: typeof x.st; m: IndexedMovie } => !!x.m);
  if (!hand.length) return { ...base, status: 'empty_hand', notice: cfg.template('watch_too_many_skips') };

  // 2. Disponibilidad en sus plataformas.
  const available = model.providers?.list.length ? hand.filter((x) => availableOn(x.m, model.providers!)) : hand;
  if (!available.length) return { ...base, status: 'empty_platforms', notice: cfg.template('watch_empty_platforms') };

  // No repetir lo que acaba de pedir cambiar (si queda algo más).
  const fresh = available.filter((x) => !model.watch_skipped_ids.has(x.m.movie.id));
  const pool = fresh.length ? fresh : available;

  const vibeRecipe = vibeRecipeOf(model, vibe, cfg);
  const passDuration = (m: IndexedMovie) => !filters.max_runtime_min || m.movie.runtime_min <= filters.max_runtime_min;
  const passVibe = (m: IndexedMovie) => !vibeRecipe || cosine(vibeRecipe, m.hat) >= p.watch_vibe_min_cosine;

  // 3 y 6. Filtros de momento; si no queda nada, se relajan en orden y se dice qué se relajó.
  const active = { duration: true, vibe: true };
  let matches = pool.filter((x) => passDuration(x.m) && passVibe(x.m));
  const relaxed: Array<'duration' | 'vibe'> = [];
  for (const f of p.watch_relax_order) {
    if (matches.length) break;
    active[f] = false;
    relaxed.push(f);
    matches = pool.filter((x) => (!active.duration || passDuration(x.m)) && (!active.vibe || passVibe(x.m)));
  }
  if (!matches.length) matches = pool;

  // 4. Mayor puntaje + bono de frescura.
  const fresh48 = now.getTime() - p.watch_fresh_hours * 3_600_000;
  const ctx = {
    model,
    vibe,
    vibeRecipe,
    bonus: (m: IndexedMovie) => {
      const st = model.states.get(m.movie.id);
      let b = 0;
      if (st?.saved_at && new Date(st.saved_at).getTime() >= fresh48) b += p.watch_fresh_bonus;
      if (st?.special_match) b += p.watch_special_bonus;
      return b;
    },
  };
  const best = matches.map((x) => scoreMovie(x.m, ctx, cfg)).sort((a, b) => b.score - a.score)[0]!;
  const notice = relaxed.length
    ? cfg.template(relaxed[0] === 'duration' && filters.max_runtime_min ? 'watch_relaxed_duration' : 'watch_relaxed_vibe')
    : undefined;
  return {
    status: 'proposal',
    movie: best.m,
    score: best.score,
    explanation: explain({ hat: best.m.hat, profile: model.profile, vibe, vibeRecipe }, cfg),
    relaxed: relaxed.filter((f) => (f === 'duration' ? !!filters.max_runtime_min : !!vibe)),
    notice: relaxed.some((f) => (f === 'duration' ? !!filters.max_runtime_min : !!vibe)) ? notice : undefined,
    filters,
  };
}
