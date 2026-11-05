// Tipos de las respuestas de TMDB que usa Kinoo (API v3). Solo los campos que leemos.
// Referencia: https://developer.themoviedb.org/reference/movie-details
export interface TmdbGenre {
  id: number;
  name: string;
}
export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
}

export interface TmdbMovieDetails {
  id: number;
  imdb_id: string | null;
  title: string;
  original_title: string;
  original_language: string;
  release_date: string;
  runtime: number | null;
  status?: string;
  adult?: boolean;
  genres: TmdbGenre[];
  overview: string;
  tagline?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  poster_path: string | null;
  backdrop_path?: string | null;
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages?: Array<{ iso_639_1: string; english_name?: string; name?: string }>;
  credits?: {
    cast: Array<{ id: number | null; name: string; character?: string; order?: number }>;
    crew: Array<{ id: number | null; name: string; job: string; department?: string }>;
  };
  keywords?: { keywords: Array<{ id: number | null; name: string }> };
  reviews?: { results: Array<{ author: string; content: string; created_at: string; author_details?: { rating: number | null } }> };
  'watch/providers'?: { results: Record<string, { link?: string; flatrate?: TmdbProvider[]; rent?: TmdbProvider[]; buy?: TmdbProvider[] }> };
  /** Solo en los fixtures: la respuesta es simulada y el id puede no ser el real. */
  _simulado?: boolean;
  _id_verificado?: boolean;
}

export interface TmdbDiscoverResult {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}
export interface TmdbPage<T> {
  page: number;
  total_pages: number;
  total_results: number;
  results: T[];
}
