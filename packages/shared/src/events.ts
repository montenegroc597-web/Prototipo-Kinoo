import type { AtomKey } from './atoms';

/** Superficie y contexto en el que pasó la acción. El back no conoce gestos ni pantallas concretas. */
export interface EventContext {
  surface?: 'onboarding' | 'discover' | 'watch' | 'profile' | string;
  vibe?: string | null;
  filters?: WatchFilters;
  client_version?: string;
  [k: string]: unknown;
}

export type Reaction = 'loved' | 'liked' | 'not_for_me';

interface Base<T extends string, P> {
  id: string;
  user_id: string;
  type: T;
  /** ISO 8601. */
  at: string;
  movie_id?: string;
  context?: EventContext;
  payload: P;
}

export type OnboardingChoiceEvent = Base<'onboarding_choice', { chosen_movie_id: string; rejected_movie_id: string }>;
export type DeckOpenedEvent = Base<'deck_opened', { deck_id: string; vibe?: string | null; size?: number }>;
export type CardFlippedEvent = Base<'card_flipped', { deck_id: string; slot: number }>;
export type SavedIntentEvent = Base<'saved_intent', { flipped: boolean; vibe?: string | null; deck_id?: string; slot?: number }>;
export type DismissedEvent = Base<'dismissed', { flipped: boolean; vibe?: string | null; deck_id?: string; slot?: number }>;
export type MarkedSeenEvent = Base<'marked_seen', { flipped?: boolean; reaction?: Reaction; vibe?: string | null }>;
export type RewatchIntentEvent = Base<'rewatch_intent', Record<string, never>>;
export type DeckCompletedEvent = Base<'deck_completed', { deck_id: string }>;
export type WatchProposedEvent = Base<'watch_proposed', { filters?: WatchFilters }>;
export type WatchSkippedEvent = Base<'watch_skipped', Record<string, never>>;
export type WatchStartedEvent = Base<'watch_started', { provider: string }>;
export type WatchConfirmedEvent = Base<'watch_confirmed', { reaction: Reaction; rewatch?: boolean; vibe?: string | null }>;
export type AttributeRefutedEvent = Base<'attribute_refuted', { atom: AtomKey }>;
export type UndoEvent = Base<'undo', { undone_event_id: string }>;
export type PlatformsSetEvent = Base<'platforms_set', { country: string; providers: string[] }>;

export type KinooEvent =
  | OnboardingChoiceEvent | DeckOpenedEvent | CardFlippedEvent | SavedIntentEvent | DismissedEvent
  | MarkedSeenEvent | RewatchIntentEvent | DeckCompletedEvent | WatchProposedEvent | WatchSkippedEvent
  | WatchStartedEvent | WatchConfirmedEvent | AttributeRefutedEvent | UndoEvent | PlatformsSetEvent;

export type EventType = KinooEvent['type'];

export const EVENT_TYPES: readonly EventType[] = [
  'onboarding_choice', 'deck_opened', 'card_flipped', 'saved_intent', 'dismissed', 'marked_seen',
  'rewatch_intent', 'deck_completed', 'watch_proposed', 'watch_skipped', 'watch_started',
  'watch_confirmed', 'attribute_refuted', 'undo', 'platforms_set',
];

/** Filtros de momento en Ver. */
export interface WatchFilters {
  max_runtime_min?: number;
  company?: 'solo' | 'pareja' | 'amigos' | 'familia' | string;
  vibe?: string | null;
}

/** Evento tal como lo manda el cliente: el servidor pone id, user_id y at si faltan. */
export type EventInput = Omit<KinooEvent, 'id' | 'user_id' | 'at'> & { id?: string; at?: string };
