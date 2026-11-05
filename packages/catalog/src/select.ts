// Selección del catálogo piloto con cuotas (sección 12.2): primero las cuotas, después lo mejor valorado y popular.
import { type SourceMovie, isLatam } from './tmdb/normalize';

export interface Quotas {
  latamShare: number;
  pre2000Share: number;
  perGenre: number;
}
export const DEFAULT_QUOTAS: Quotas = { latamShare: 0.15, pre2000Share: 0.2, perGenre: 3 };

/** Popularidad × calidad: log(votos) × nota. Favorece lo conocido y bien valorado sin que lo viral lo tape todo. */
export const rank = (m: Pick<SourceMovie, 'vote_count' | 'vote_average'>) => Math.log10(1 + m.vote_count) * m.vote_average;

export function selectCatalog(all: SourceMovie[], target: number, opts: { quotas?: Quotas; mustInclude?: (m: SourceMovie) => boolean } = {}): SourceMovie[] {
  const q = opts.quotas ?? DEFAULT_QUOTAS;
  const ranked = all.filter((m) => m.runtime_min > 0).sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id));
  const chosen = new Map<string, SourceMovie>();
  const take = (xs: SourceMovie[], n: number) => {
    for (const m of xs) {
      if (chosen.size >= target || n <= 0) return;
      if (!chosen.has(m.id)) {
        chosen.set(m.id, m);
        n--;
      }
    }
  };
  if (opts.mustInclude) take(ranked.filter(opts.mustInclude), target);
  const need = (share: number, pred: (m: SourceMovie) => boolean) => Math.max(0, Math.ceil(target * share) - [...chosen.values()].filter(pred).length);
  take(ranked.filter(isLatam), need(q.latamShare, isLatam));
  const pre2000 = (m: SourceMovie) => m.year < 2000;
  take(ranked.filter(pre2000), need(q.pre2000Share, pre2000));
  const genres = [...new Set(ranked.flatMap((m) => m.genres))];
  for (const g of genres)
    take(
      ranked.filter((m) => m.genres.includes(g)),
      Math.max(0, q.perGenre - [...chosen.values()].filter((m) => m.genres.includes(g)).length),
    );
  take(ranked, target);
  return [...chosen.values()];
}

export function quotaReport(movies: SourceMovie[]) {
  const n = movies.length || 1;
  return {
    total: movies.length,
    latam: movies.filter(isLatam).length,
    latamShare: movies.filter(isLatam).length / n,
    pre2000: movies.filter((m) => m.year < 2000).length,
    pre2000Share: movies.filter((m) => m.year < 2000).length / n,
    genres: [...new Set(movies.flatMap((m) => m.genres))].length,
  };
}
