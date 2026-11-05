import type { AtomVector, Movie, Params } from '@kinoo/shared';
import { catalogStats, distinctive, quality, type CatalogStats } from './distinct';

/** Película con lo que el motor calcula una vez: rasgo distintivo y calidad. */
export interface IndexedMovie {
  movie: Movie;
  hat: AtomVector;
  quality: number;
}

export interface Catalog {
  stats: CatalogStats;
  list: IndexedMovie[];
  byId: Map<string, IndexedMovie>;
}

/** Prepara el catálogo. effectiveAtoms permite pasar los valores combinados con votos de la comunidad (sección 13). */
export function buildCatalog(movies: Movie[], params: Params, effectiveAtoms?: Map<string, AtomVector>): Catalog {
  const withAtoms = movies.map((m) => ({ ...m, atoms: effectiveAtoms?.get(m.id) ?? m.atoms }));
  const stats = catalogStats(withAtoms);
  const list = withAtoms.map((movie) => ({
    movie,
    hat: distinctive(movie.atoms, stats.mean),
    quality: quality(movie, params.quality_prior_mean, params.quality_prior_votes),
  }));
  return { stats, list, byId: new Map(list.map((x) => [x.movie.id, x])) };
}

/** Sección 13: (k·M_LLM + Σ votos) / (k + n). */
export function effectiveAtomValue(llm: number, votes: number[], k: number): number {
  return (k * llm + votes.reduce((a, b) => a + b, 0)) / (k + votes.length);
}
