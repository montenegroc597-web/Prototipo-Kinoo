import type { AtomKey, PartialAtomVector } from './atoms';

export interface AtomDef {
  key: AtomKey;
  dimension: string;
  label: string;
  description: string;
  /** Nombre corto para chips de tema (máximo 14 caracteres). */
  theme?: string;
}
export interface VibeDef {
  key: string;
  name: string;
  definition: string;
  aliases?: string[];
  active: boolean;
  version: number;
  recipe: PartialAtomVector;
  quality_weight?: number;
  example_movie_ids?: string[];
}
export interface ActionWeight {
  action: string;
  variant: string;
  signal: number;
  eta: number;
  reason?: string;
}
export type DeckRole = 'afin' | 'creador' | 'comodin' | 'sorpresa';
export interface DeckSlot {
  role: DeckRole;
  rank?: 'first' | 'second';
}
export interface DeckRecipe {
  size: number;
  default?: boolean;
  slots: DeckSlot[];
}
export interface Template {
  key: string;
  text: string;
}
export interface Archetype {
  key: string;
  name: string;
  recipe: PartialAtomVector;
}

export interface Params {
  distinct_threshold: number;
  beta_with_vibe: number;
  beta_without_vibe: number;
  beta_low_confidence: number;
  low_confidence_signal_count: number;
  quality_weight: number;
  quality_prior_mean: number;
  quality_prior_votes: number;
  exclusion_days_dismissed: number;
  diversity_max_cosine: number;
  diversity_unique_director: boolean;
  comodin_min_cosine: number;
  comodin_max_cosine: number;
  comodin_min_top_atom: number;
  sorpresa_min_quality: number;
  sorpresa_min_cosine: number;
  sorpresa_max_score_percentile: number;
  curators_for_special: number;
  special_match_percentile: number;
  special_match_max_per_deck: number;
  deck_default_size: number;
  deck_ready_tonight_min: number;
  /** El cierre del mazo solo resume un gusto si se guardaron al menos estas cartas. */
  closing_min_saves: number;
  /** Estándar de caracteres de la carta: más largo se recorta con fitText() para que no se salga del borde. */
  card_premise_max: number;
  card_title_max: number;
  card_subtitle_max: number;
  card_overview_max: number;
  card_explanation_max: number;
  card_pillar_max: number;
  card_dna_phrase_max: number;
  card_dna_themes_max_chars: number;
  card_similar_title_max: number;
  watch_title_max: number;
  watch_meta_max: number;
  watch_why_max: number;
  closing_text_max: number;
  watch_fresh_hours: number;
  watch_fresh_bonus: number;
  watch_special_bonus: number;
  watch_skip_limit: number;
  watch_vibe_min_cosine: number;
  watch_relax_order: Array<'duration' | 'vibe'>;
  curator_follow_bonus: number;
  dismiss_fatigue_weight: number;
  dismiss_fatigue_hours: number;
  community_prior_weight: number;
  onboarding_min_pairs: number;
  onboarding_max_pairs: number;
  team_deck_owner: string;
}

/** Toda la configuración que recibe el motor. El motor nunca la lee de archivos: entra como parámetro. */
export interface EngineConfig {
  atoms: AtomDef[];
  vibes: VibeDef[];
  actionWeights: ActionWeight[];
  deckRecipes: DeckRecipe[];
  templates: Template[];
  archetypes: Archetype[];
  params: Params;
}
