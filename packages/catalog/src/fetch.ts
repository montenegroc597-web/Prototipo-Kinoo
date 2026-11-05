// Paso 1 del pipeline: descubrir películas en TMDB (real o simulado), traer su ficha completa y elegir el catálogo piloto.
import { type Quotas, selectCatalog } from './select';
import { type SourceMovie, normalize } from './tmdb/normalize';
import type { TmdbTransport } from './tmdb/transport';
import type { TmdbDiscoverResult, TmdbGenre, TmdbMovieDetails, TmdbPage } from './tmdb/types';

export interface FetchOptions {
  target: number;
  country: string;
  quotas?: Quotas;
  /** Páginas de discover por consulta (cada página trae 20). */
  pages?: { popular: number; topRated: number; pre2000: number; perCountry: number; perGenre: number };
  latamCountries?: string[];
  mustInclude?: (m: SourceMovie) => boolean;
  onProgress?: (msg: string) => void;
}

export async function fetchCatalog(t: TmdbTransport, o: FetchOptions): Promise<SourceMovie[]> {
  const pages = o.pages ?? { popular: 10, topRated: 8, pre2000: 6, perCountry: 2, perGenre: 1 };
  const base = { watch_region: o.country, with_watch_monetization_types: 'flatrate', language: 'es-CO', 'vote_count.gte': 200 };
  const ids = new Set<number>();
  const discover = async (params: Record<string, string | number>, n: number) => {
    for (let page = 1; page <= n; page++) {
      const r = await t.get<TmdbPage<TmdbDiscoverResult>>('/discover/movie', { ...base, ...params, page });
      r.results.forEach((m) => ids.add(m.id));
      if (page >= r.total_pages) break;
    }
  };
  const { genres } = await t.get<{ genres: TmdbGenre[] }>('/genre/movie/list', { language: 'es-CO' });
  await discover({ sort_by: 'popularity.desc' }, pages.popular);
  await discover({ sort_by: 'vote_average.desc', 'vote_count.gte': 1000 }, pages.topRated);
  await discover({ sort_by: 'popularity.desc', 'primary_release_date.lte': '1999-12-31' }, pages.pre2000);
  for (const c of o.latamCountries ?? ['MX', 'AR', 'CO', 'BR', 'CL'])
    await discover({ sort_by: 'popularity.desc', with_origin_country: c, 'vote_count.gte': 50 }, pages.perCountry);
  for (const g of genres) await discover({ sort_by: 'popularity.desc', with_genres: g.id }, pages.perGenre);
  o.onProgress?.(`${ids.size} candidatas descubiertas`);

  const details: SourceMovie[] = [];
  for (const id of ids) {
    const d = await t.get<TmdbMovieDetails>(`/movie/${id}`, { language: 'es-CO', append_to_response: 'credits,keywords,watch/providers,reviews' });
    const m = normalize(d, o.country);
    if (m.runtime_min > 0 && (m.providers[o.country]?.length ?? 0) > 0) details.push(m);
  }
  o.onProgress?.(`${details.length} con duración y plataforma en ${o.country}`);
  return selectCatalog(details, o.target, { quotas: o.quotas, mustInclude: o.mustInclude });
}
