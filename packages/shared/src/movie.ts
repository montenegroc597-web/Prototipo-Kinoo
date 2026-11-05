import type { AtomVector } from './atoms';

/** Una película del catálogo. Los átomos son "gusto"; el resto son datos para filtrar y diversificar. */
export interface Movie {
  id: string;
  tmdb_id?: number;
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
  /** ADN de la película según el juez sintético (0–1 por átomo). */
  atoms: AtomVector;
  /** Frase gancho: cara A de la carta. Máximo 160 caracteres, en mayúsculas. */
  hook: string;
  /** Los cuatro pilares visibles del reverso (ritmo, tono, historia, visual). */
  pillars: { ritmo: string; tono: string; historia: string; visual: string };
  /** Plataformas por país (código ISO, p. ej. "CO"), solo suscripción (flatrate). */
  providers: Record<string, string[]>;
  tagger: { model: string; prompt_version: string; tagged_at: string };
  source: 'tmdb' | 'semilla_manual';
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
