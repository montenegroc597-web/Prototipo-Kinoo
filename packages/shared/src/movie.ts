import type { AtomVector } from './atoms';

/** Una película del catálogo. Los átomos son "gusto"; el resto son datos para filtrar y diversificar. */
export interface Movie {
  id: string;
  tmdb_id?: number;
  /** Id de IMDb (tt…), lo trae TMDB en external ids. */
  imdb_id?: string | null;
  title: string;
  original_title?: string;
  year: number;
  runtime_min: number;
  genres: string[];
  directors: string[];
  countries: string[];
  original_language: string;
  /** Nota de TMDB (0–10) y número de votos: base de calidad(m). */
  vote_average: number;
  vote_count: number;
  popularity?: number;
  poster_path?: string | null;
  overview?: string;
  /** Palabras clave de TMDB (en inglés). Ayudan al juez; no entran al perfil. */
  keywords?: string[];
  /** ADN de la película según el juez sintético (0–1 por átomo). */
  atoms: AtomVector;
  /** Frase gancho: cara A de la carta. Máximo 160 caracteres, en mayúsculas. */
  hook: string;
  /** Los cuatro pilares visibles del reverso (ritmo, tono, historia, visual). */
  pillars: { ritmo: string; tono: string; historia: string; visual: string };
  /** Plataformas por país (código ISO, p. ej. "CO"), solo suscripción (flatrate). */
  providers: Record<string, string[]>;
  tagger: { model: string; prompt_version: string; tagged_at: string };
  /** tmdb = API real; tmdb_simulado = fixtures con el formato de TMDB; semilla_manual = escrita a mano. */
  source: 'tmdb' | 'tmdb_simulado' | 'semilla_manual';
}

export interface Curator {
  id: string;
  name: string;
}

/** Mazo con dueño: system (Equipo Kinoo), curator o user. */
export interface CuratedDeck {
  id: string;
  owner_kind: 'system' | 'curator' | 'user';
  owner_id: string;
  owner_name: string;
  title: string;
  movie_ids: string[];
  notes?: Record<string, string>;
}

/** Base del CDN de imágenes de TMDB. Tamaños de póster: w92, w154, w185, w342, w500, w780, original. */
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

/**
 * URL lista para usar de un póster.
 * - poster_path de TMDB ("/abc.jpg") → CDN de TMDB.
 * - Archivo del repositorio ("posters/<id>.jpg") → assetBaseUrl + ruta (por ejemplo "https://…/Prototipo-Kinoo/" o "../").
 * - Sin póster → null (el front muestra su fondo de color).
 */
export function posterUrl(posterPath: string | null | undefined, opts: { assetBaseUrl?: string; size?: string } = {}): string | null {
  if (!posterPath) return null;
  if (/^https?:\/\//.test(posterPath)) return posterPath;
  if (posterPath.startsWith('/')) return `${TMDB_IMAGE_BASE}${opts.size ?? 'w500'}${posterPath}`;
  return `${opts.assetBaseUrl ?? ''}${posterPath}`;
}
