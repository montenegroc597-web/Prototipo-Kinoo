// De la respuesta de TMDB a la ficha de película de Kinoo (metadatos; los átomos los pone el juez después).
import type { TmdbMovieDetails } from './types';

export const LATAM = ['AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'GT', 'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE'];

/** Nombres de plataformas de TMDB/JustWatch → nombres que usa Kinoo en la interfaz. */
export const PROVIDER_NAMES: Record<string, string> = {
  'Amazon Prime Video': 'Prime Video',
  'Disney Plus': 'Disney+',
  'Apple TV+': 'Apple TV',
  'Apple TV Plus': 'Apple TV',
  MUBI: 'Mubi',
  'HBO Max': 'Max',
};

/** Ficha de película antes de etiquetar. */
export interface SourceMovie {
  id: string;
  tmdb_id: number;
  imdb_id: string | null;
  tmdb_id_verified: boolean;
  title: string;
  original_title: string;
  year: number;
  runtime_min: number;
  genres: string[];
  directors: string[];
  cast: string[];
  countries: string[];
  original_language: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  poster_path: string | null;
  overview: string;
  keywords: string[];
  reviews: string[];
  providers: Record<string, string[]>;
  simulated: boolean;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Id estable y legible: título original (o el título en español si el original no usa letras latinas) + año. */
export function kinooId(d: Pick<TmdbMovieDetails, 'original_title' | 'title' | 'release_date'>): string {
  const base = slugify(d.original_title) || slugify(d.title);
  return `${base}-${(d.release_date || '0000').slice(0, 4)}`;
}

export function normalize(d: TmdbMovieDetails, country = 'CO'): SourceMovie {
  const flat = d['watch/providers']?.results?.[country]?.flatrate ?? [];
  return {
    id: kinooId(d),
    tmdb_id: d.id,
    imdb_id: d.imdb_id ?? null,
    tmdb_id_verified: d._simulado ? d._id_verificado === true : true,
    title: d.title,
    original_title: d.original_title,
    year: Number((d.release_date || '0').slice(0, 4)),
    runtime_min: d.runtime ?? 0,
    genres: d.genres.map((g) => g.name),
    directors: (d.credits?.crew ?? []).filter((c) => c.job === 'Director').map((c) => c.name),
    cast: (d.credits?.cast ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .slice(0, 8)
      .map((c) => c.name),
    countries: d.production_countries.map((c) => c.iso_3166_1),
    original_language: d.original_language,
    vote_average: d.vote_average,
    vote_count: d.vote_count,
    popularity: d.popularity,
    poster_path: d.poster_path,
    overview: d.overview,
    keywords: (d.keywords?.keywords ?? []).map((k) => k.name).slice(0, 15),
    reviews: (d.reviews?.results ?? []).slice(0, 2).map((r) => r.content.slice(0, 600)),
    providers: {
      [country]: [
        ...new Set(flat.sort((a, b) => (a.display_priority ?? 0) - (b.display_priority ?? 0)).map((p) => PROVIDER_NAMES[p.provider_name] ?? p.provider_name)),
      ],
    },
    simulated: !!d._simulado,
  };
}

export const isLatam = (m: Pick<SourceMovie, 'countries'>) => m.countries.some((c) => LATAM.includes(c));
