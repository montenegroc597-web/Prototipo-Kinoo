import type { ActiveDeck } from '@kinoo/engine';
// Puertos del back (arquitectura hexagonal): lo que el núcleo necesita de afuera, sin saber quién lo da.
// Hay adaptadores para PostgreSQL genérico, Supabase (REST) y memoria (modo demo y pruebas).
import type { AtomVector, CuratedDeck, EngineConfig, KinooEvent, Movie } from '@kinoo/shared';
import type { DerivedRows } from './derived';
import type { UserSnapshot } from './service';

/** Todo lo que el motor necesita del catálogo. Es igual para todas las personas y se puede cachear. */
export interface CatalogData {
  config: EngineConfig;
  movies: Movie[];
  curatedDecks: CuratedDeck[];
  /** Valores de átomos corregidos por la comunidad (solo películas con votos). */
  effectiveAtoms: Map<string, AtomVector>;
}

/** Lo que cambió en una petición: se guarda en este orden (eventos primero: son la fuente de verdad). */
export interface UserChanges {
  newEvents: KinooEvent[];
  activeDeck: ActiveDeck | null;
  deckChanged: boolean;
  derived: DerivedRows;
}

export interface KinooRepository {
  loadCatalog(): Promise<CatalogData>;
  loadUser(userId: string): Promise<UserSnapshot>;
  saveUser(userId: string, changes: UserChanges): Promise<void>;
}
