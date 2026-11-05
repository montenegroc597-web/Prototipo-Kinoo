import type { AtomVector } from '@kinoo/shared';
import type { IndexedMovie } from './catalog';
import type { ConfigIndex } from './configIndex';
import type { UserModel } from './profile';
import { cosine } from './vector';

export interface ScoreContext {
  model: UserModel;
  /** Receta personal del mood elegido (o null si no hay mood). */
  vibe: string | null;
  vibeRecipe: AtomVector | null;
  bonus?: (m: IndexedMovie) => number;
}

export interface Scored {
  m: IndexedMovie;
  score: number;
  cosProfile: number;
  cosVibe: number;
}

/** β de la sección 8: cuánto pesa el perfil frente al mood. */
export function betaFor(ctx: Pick<ScoreContext, 'model' | 'vibe'>, cfg: ConfigIndex): number {
  const p = cfg.params;
  if (!ctx.vibe) return p.beta_without_vibe;
  return ctx.model.signal_count < p.low_confidence_signal_count ? p.beta_low_confidence : p.beta_with_vibe;
}

/** S(u, m) = β·cos(U, m̂) + (1 − β)·cos(R, m̂) + γ·calidad(m) + bonos. */
export function scoreMovie(m: IndexedMovie, ctx: ScoreContext, cfg: ConfigIndex): Scored {
  const beta = betaFor(ctx, cfg);
  const cosProfile = cosine(ctx.model.profile, m.hat);
  const cosVibe = ctx.vibeRecipe ? cosine(ctx.vibeRecipe, m.hat) : 0;
  const vibeDef = ctx.vibe ? cfg.vibes.get(ctx.vibe) : undefined;
  const gamma = vibeDef?.quality_weight ?? cfg.params.quality_weight;
  const score = beta * cosProfile + (1 - beta) * cosVibe + gamma * m.quality + (ctx.bonus?.(m) ?? 0);
  return { m, score, cosProfile, cosVibe };
}

export function percentile(sortedAsc: number[], p: number): number {
  if (!sortedAsc.length) return 0;
  const i = Math.min(sortedAsc.length - 1, Math.max(0, Math.floor(p * (sortedAsc.length - 1))));
  return sortedAsc[i]!;
}
