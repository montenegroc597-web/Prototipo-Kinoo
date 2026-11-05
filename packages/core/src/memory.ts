import type { ActiveDeck } from '@kinoo/engine';
// Repositorio en memoria: para pruebas y para el modo demo. Cumple el mismo contrato que PostgreSQL y Supabase.
import type { KinooEvent } from '@kinoo/shared';
import type { CatalogData, KinooRepository, UserChanges } from './ports';
import type { UserSnapshot } from './service';

export class MemoryRepository implements KinooRepository {
  private readonly events = new Map<string, KinooEvent[]>();
  private readonly decks = new Map<string, ActiveDeck | null>();
  readonly derived = new Map<string, UserChanges['derived']>();

  constructor(private readonly catalog: CatalogData) {}

  async loadCatalog() {
    return this.catalog;
  }

  async loadUser(userId: string): Promise<UserSnapshot> {
    return {
      user_id: userId,
      events: structuredClone(this.events.get(userId) ?? []),
      active_deck: structuredClone(this.decks.get(userId) ?? null),
      followed_curator_ids: [],
    };
  }

  async saveUser(userId: string, c: UserChanges) {
    this.events.set(userId, [...(this.events.get(userId) ?? []), ...structuredClone(c.newEvents)]);
    if (c.deckChanged) this.decks.set(userId, structuredClone(c.activeDeck));
    this.derived.set(userId, c.derived);
  }
}
