import type { AtomVector } from './atoms';
import type { DeckRole } from './config';
import type { WatchFilters } from './events';

/** Lo que el front necesita para dibujar una carta: las dos caras. El front decide cuál mostrar primero. */
export interface CardDTO {
  slot: number;
  role: DeckRole;
  movie_id: string;
  front: { hook: string; pillars: { ritmo: string; tono: string; historia: string; visual: string } };
  back: {
    title: string;
    year: number;
    runtime_min: number;
    genres: string[];
    directors: string[];
    poster_path: string | null;
    /** URL lista para usar en <img> (TMDB o archivo local). null si no hay póster. */
    poster_url: string | null;
    overview: string;
    providers: string[];
  };
  /** Razón en palabras. Nunca contiene números ni %. */
  explanation: string;
  /**
   * Textos listos para la carta, recortados con el estándar de caracteres (params card_*_max).
   * Úsalos en la carta; los campos completos (back.overview, back.title…) quedan para una vista de detalle.
   */
  display: {
    premise: string;
    title: string;
    subtitle: string;
    overview: string;
    explanation: string;
    pillars: { ritmo: string; tono: string; historia: string; visual: string };
    /** ADN de la película (no de la persona): "Historias íntimas y melancólicas". */
    dna_phrase: string;
    /** Temas cortos para chips (nombre corto del átomo); su largo total cabe en una fila. */
    themes: string[];
  };
  /** Tratamiento visual especial (sorpresa). */
  special_treatment: boolean;
  curator_name?: string;
}

export interface DeckDTO {
  deck_id: string;
  vibe: string | null;
  size: number;
  opened_at: string;
  cards: CardDTO[];
}

export interface DeckClosingDTO {
  deck_id: string;
  learned: string;
  top_atoms: string[];
  saved_posters: Array<{ movie_id: string; title: string; poster_path: string | null; poster_url: string | null }>;
  ready_tonight: boolean;
  /** Conteos del mazo, como los muestra el cierre: quieres ver (guardadas), ya la viste, dejaste pasar. Son conteos, no afinidad. */
  counts: { want: number; seen: number; pass: number };
  /** Mood con el que se abrió el mazo (clave de vibes.json) o null si fue sin mood. */
  vibe: string | null;
}

export interface SaveResultDTO {
  special_match: boolean;
  message?: string;
}

export interface WatchProposalDTO {
  status: 'proposal' | 'suggest_discover' | 'empty_platforms' | 'empty_hand';
  card?: CardDTO;
  relaxed: Array<'duration' | 'vibe'>;
  notice?: string;
  filters: WatchFilters;
}

export interface OnboardingPairDTO {
  left_movie_id: string;
  right_movie_id: string;
  left_title: string;
  right_title: string;
}

export interface ArchetypeDTO {
  key: string;
  name: string;
  top_atoms: string[];
}

export interface ProfileDTO {
  user_id: string;
  vector: AtomVector;
  signal_count: number;
  archetype: ArchetypeDTO;
}

/** Nivel en palabras: reemplaza a los porcentajes en todas las pantallas. */
export type LevelWord = 'alto' | 'medio' | 'bajo';

/** "Lo que el mazo dice de ti": sale de las acciones reales. Nunca trae números de afinidad. */
export interface InsightDTO {
  /** false si hay muy pocas señales: entonces title, body, rasgos y moods van vacíos y se muestra empty_text. */
  ready: boolean;
  title: string;
  kicker: string;
  body: string;
  traits: Array<{ key: string; label: string; level: LevelWord }>;
  moods: Array<{ key: string; name: string; level: LevelWord }>;
  archetype: { key: string; name: string };
  empty_text: string;
}

/** Un mood del selector de Ver. "todas" va primero y significa "sin mood". */
export interface MoodDTO {
  key: string;
  name: string;
  desc: string;
}

/** Una plataforma de la película (datos del catálogo, solo suscripción). key es estable para buscar el logo. */
export interface ProviderDTO {
  key: string;
  name: string;
  note: string;
  /** Siempre false por ahora: el catálogo solo trae suscripción, sin alquiler ni precios. */
  rent: boolean;
}

export interface BillboardFilmDTO {
  id: string;
  title: string;
  /** Tamaño del título en px para Ver B7c (params watch_title_size_*). */
  title_size: number;
  /** "1 h 44 · Drama · Romance" */
  meta: string;
  /** Por qué hoy, en palabras. */
  quote: string;
  poster_url: string | null;
  /** Colores para la carta sin póster (fondo, sombra, acento), según los átomos estéticos de la película. */
  palette: [string, string, string];
  starred: boolean;
  /** Primero las plataformas de la persona. */
  providers: ProviderDTO[];
  runtime_min: number;
}

/** Cartelera de Ver para un mood, en el orden del motor. */
export interface BillboardDTO {
  mood: MoodDTO;
  films: BillboardFilmDTO[];
  status: 'ok' | 'empty_hand' | 'empty_mood' | 'empty_platforms';
  notice: string | null;
}

/** Repisa de Ver: lo que ya vio y calificó, lo más reciente primero. */
export interface ShelfItemDTO {
  id: string;
  title: string;
  /** Tamaño del título en px cuando se muestra en la carta de Ver (misma regla que la cartelera). */
  title_size: number;
  poster_url: string | null;
  palette: [string, string, string];
  /** "hace 3 semanas" */
  when: string;
  /** "¡Me encantó!" */
  rating: string;
  /** Razón para volver a verla. */
  back: string;
  /** "1 h 44 · Drama · Romance" */
  meta: string;
  runtime_min: number;
  /** Mismo formato que la cartelera: primero las plataformas de la persona. */
  providers: ProviderDTO[];
}
