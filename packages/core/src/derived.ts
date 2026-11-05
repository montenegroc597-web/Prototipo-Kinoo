// Filas derivadas para Supabase (user_taste_profiles, user_vibe_recipes, user_movie_state).
// Son una vista de trabajo: se pueden recalcular desde events en cualquier momento.
import type { UserModel } from '@kinoo/engine';

export type DerivedRows = ReturnType<typeof derivedRows>;

export function derivedRows(m: UserModel) {
  const now = new Date().toISOString();
  return {
    taste: { user_id: m.user_id, vector: m.profile, signal_count: m.signal_count, formula_version: 'v2', updated_at: now },
    vibes: Object.entries(m.vibes).map(([vibe, r]) => ({
      user_id: m.user_id,
      vibe,
      recipe: r.recipe,
      seed_version: r.seed_version,
      signal_count: r.signal_count,
      updated_at: now,
    })),
    states: [...m.states.values()].map((s) => ({
      user_id: m.user_id,
      movie_id: s.movie_id,
      state: s.state,
      special_match: s.special_match,
      saved_at: s.saved_at ?? null,
      updated_at: s.updated_at,
    })),
  };
}
