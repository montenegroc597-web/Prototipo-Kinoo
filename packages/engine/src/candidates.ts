import type { Catalog, IndexedMovie } from './catalog';
import type { ConfigIndex } from './configIndex';
import type { UserModel } from './profile';

export interface HardFilters {
  /** Solo películas disponibles en estas plataformas, en este país. */
  providers?: { country: string; list: string[] } | null;
  max_runtime_min?: number;
  exclude_ids?: Set<string>;
}

export function availableOn(m: IndexedMovie, p: { country: string; list: string[] }): boolean {
  const here = m.movie.providers?.[p.country] ?? [];
  return here.some((x) => p.list.includes(x));
}

/**
 * Candidatos de Descubrir (sección 8): fuera las guardadas, vistas o para repetir (siempre),
 * las descartadas en los últimos N días, y las que no pasan los filtros duros.
 */
export function discoverCandidates(catalog: Catalog, model: UserModel, cfg: ConfigIndex, now: Date, f: HardFilters = {}): IndexedMovie[] {
  const days = cfg.params.exclusion_days_dismissed;
  const cutoff = now.getTime() - days * 86_400_000;
  return catalog.list.filter((m) => {
    if (f.exclude_ids?.has(m.movie.id)) return false;
    const st = model.states.get(m.movie.id);
    if (st) {
      if (st.state !== 'dismissed') return false;
      if (new Date(st.updated_at).getTime() >= cutoff) return false;
    }
    if (f.providers && f.providers.list.length && !availableOn(m, f.providers)) return false;
    if (f.max_runtime_min && m.movie.runtime_min > f.max_runtime_min) return false;
    return true;
  });
}
