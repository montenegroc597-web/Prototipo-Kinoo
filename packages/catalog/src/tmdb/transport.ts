// Cómo se llega a TMDB: por HTTP (la API real) o desde fixtures (respuestas simuladas guardadas en el repositorio).
// El resto del pipeline no sabe cuál de los dos está usando.
import type { TmdbDiscoverResult, TmdbGenre, TmdbMovieDetails, TmdbPage } from './types';

export type Params = Record<string, string | number | undefined>;

export interface TmdbTransport {
  readonly kind: 'http' | 'fixtures';
  get<T>(path: string, params?: Params): Promise<T>;
}

/** La API real. Acepta clave v3 (api_key) o token de lectura v4 (Bearer). Reintenta ante 429. */
export function httpTransport(apiKey: string, f: typeof fetch = fetch, base = 'https://api.themoviedb.org/3'): TmdbTransport {
  const bearer = apiKey.length > 40;
  return {
    kind: 'http',
    async get<T>(path: string, params: Params = {}) {
      const u = new URL(base + path);
      for (const [k, v] of Object.entries(params)) if (v !== undefined) u.searchParams.set(k, String(v));
      if (!bearer) u.searchParams.set('api_key', apiKey);
      for (let i = 0; i < 4; i++) {
        const r = await f(u, bearer ? { headers: { Authorization: `Bearer ${apiKey}` } } : {});
        if (r.status === 429) {
          await new Promise((s) => setTimeout(s, 1000 * 2 ** i));
          continue;
        }
        if (!r.ok) throw new Error(`TMDB ${r.status} en ${path}`);
        return (await r.json()) as T;
      }
      throw new Error(`TMDB sigue respondiendo 429 en ${path}`);
    },
  };
}

export const GENRES_ES: TmdbGenre[] = [
  { id: 28, name: 'Acción' },
  { id: 12, name: 'Aventura' },
  { id: 16, name: 'Animación' },
  { id: 35, name: 'Comedia' },
  { id: 80, name: 'Crimen' },
  { id: 99, name: 'Documental' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Familia' },
  { id: 14, name: 'Fantasía' },
  { id: 36, name: 'Historia' },
  { id: 27, name: 'Terror' },
  { id: 10402, name: 'Música' },
  { id: 9648, name: 'Misterio' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Ciencia ficción' },
  { id: 10770, name: 'Película de TV' },
  { id: 53, name: 'Suspense' },
  { id: 10752, name: 'Bélica' },
  { id: 37, name: 'Western' },
];

/**
 * Simulación de TMDB a partir de fichas guardadas (fixtures/tmdb/movie/<id>.json).
 * Implementa los endpoints que usa el pipeline, con los mismos filtros y la misma paginación (20 por página).
 */
export function fixtureTransport(movies: TmdbMovieDetails[]): TmdbTransport {
  const byId = new Map(movies.map((m) => [m.id, m]));
  const PAGE = 20;
  const discover = (p: Params): TmdbPage<TmdbDiscoverResult> => {
    const region = String(p.watch_region ?? 'CO');
    let list = movies.filter((m) => (m['watch/providers']?.results?.[region]?.flatrate?.length ?? 0) > 0);
    if (p['vote_count.gte'] !== undefined) list = list.filter((m) => m.vote_count >= Number(p['vote_count.gte']));
    if (p['primary_release_date.lte']) list = list.filter((m) => m.release_date <= String(p['primary_release_date.lte']));
    if (p['primary_release_date.gte']) list = list.filter((m) => m.release_date >= String(p['primary_release_date.gte']));
    if (p.with_genres) list = list.filter((m) => m.genres.some((g) => String(g.id) === String(p.with_genres)));
    if (p.with_origin_country) list = list.filter((m) => m.production_countries.some((c) => c.iso_3166_1 === p.with_origin_country));
    const [field, dir] = String(p.sort_by ?? 'popularity.desc').split('.');
    const key = (m: TmdbMovieDetails) =>
      field === 'vote_average' ? m.vote_average : field === 'primary_release_date' ? Date.parse(m.release_date) : m.popularity;
    list = [...list].sort((a, b) => (dir === 'asc' ? key(a) - key(b) : key(b) - key(a)));
    const page = Number(p.page ?? 1);
    return {
      page,
      total_results: list.length,
      total_pages: Math.max(1, Math.ceil(list.length / PAGE)),
      results: list.slice((page - 1) * PAGE, page * PAGE).map((m) => ({
        id: m.id,
        title: m.title,
        original_title: m.original_title,
        release_date: m.release_date,
        popularity: m.popularity,
        vote_average: m.vote_average,
        vote_count: m.vote_count,
        genre_ids: m.genres.map((g) => g.id),
      })),
    };
  };
  return {
    kind: 'fixtures',
    async get<T>(path: string, params: Params = {}) {
      if (path === '/genre/movie/list') return { genres: GENRES_ES } as T;
      if (path === '/discover/movie') return discover(params) as T;
      if (path === '/search/movie') {
        const q = String(params.query ?? '').toLowerCase();
        const results = movies.filter(
          (m) => (m.title + ' ' + m.original_title).toLowerCase().includes(q) && (!params.year || m.release_date.startsWith(String(params.year))),
        );
        return { page: 1, total_pages: 1, total_results: results.length, results } as T;
      }
      const m = path.match(/^\/movie\/(\d+)$/);
      if (m) {
        const d = byId.get(Number(m[1]));
        if (!d) throw new Error(`TMDB 404 en ${path}`);
        return structuredClone(d) as T;
      }
      throw new Error(`La simulación de TMDB no implementa ${path}`);
    },
  };
}
