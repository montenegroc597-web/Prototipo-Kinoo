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
    title: string; year: number; runtime_min: number; genres: string[]; directors: string[];
    poster_path: string | null; overview: string; providers: string[];
  };
  /** Razón en palabras. Nunca contiene números ni %. */
  explanation: string;
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
  saved_posters: Array<{ movie_id: string; title: string; poster_path: string | null }>;
  ready_tonight: boolean;
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

export interface OnboardingPairDTO { left_movie_id: string; right_movie_id: string; left_title: string; right_title: string }

export interface ArchetypeDTO { key: string; name: string; top_atoms: string[] }

export interface ProfileDTO {
  user_id: string;
  vector: AtomVector;
  signal_count: number;
  archetype: ArchetypeDTO;
}
