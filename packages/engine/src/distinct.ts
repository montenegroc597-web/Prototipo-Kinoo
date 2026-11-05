import { ATOM_KEYS, type AtomVector, type Movie } from '@kinoo/shared';
import { clamp, zeroVector } from './vector';

export interface CatalogStats {
  mean: AtomVector;
  stddev: AtomVector;
}

/** μᵢ y desviación de cada átomo en el catálogo. Se recalcula cuando cambia el catálogo. */
export function catalogStats(movies: Pick<Movie, 'atoms'>[]): CatalogStats {
  const mean = zeroVector();
  const stddev = zeroVector();
  const n = movies.length || 1;
  for (const m of movies) for (const k of ATOM_KEYS) mean[k] += (m.atoms[k] ?? 0) / n;
  for (const m of movies) for (const k of ATOM_KEYS) stddev[k] += ((m.atoms[k] ?? 0) - mean[k]) ** 2 / n;
  for (const k of ATOM_KEYS) stddev[k] = Math.sqrt(stddev[k]);
  return { mean, stddev };
}

/**
 * Rasgo distintivo (sección 4.1): m̂ᵢ = clamp((Mᵢ − μᵢ) / (1 − μᵢ), 0, 1).
 * Lo que la película no tiene, o tiene igual que el promedio, vale 0.
 */
export function distinctive(atoms: AtomVector, mean: AtomVector): AtomVector {
  const out = zeroVector();
  for (const k of ATOM_KEYS) {
    const mu = mean[k];
    const den = 1 - mu;
    out[k] = den <= 1e-9 ? 0 : clamp(((atoms[k] ?? 0) - mu) / den, 0, 1);
  }
  return out;
}

/** Nota de TMDB ajustada por número de votos (promedio bayesiano), de 0 a 1. */
export function quality(m: Pick<Movie, 'vote_average' | 'vote_count'>, priorMean: number, priorVotes: number): number {
  const v = Math.max(0, m.vote_count || 0);
  const r = m.vote_average || 0;
  return clamp((v * r + priorVotes * priorMean) / (v + priorVotes) / 10, 0, 1);
}
