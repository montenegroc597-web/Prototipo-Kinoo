// Repositorio sobre la API REST de Supabase (PostgREST), sin dependencias: solo fetch.
// Se usa desde las Edge Functions con el JWT de la persona, así RLS aplica siempre.
import type { CatalogData, KinooRepository, UserChanges, UserSnapshot } from '@kinoo/core';
import { activeDeckToRow, eventToRow, rowToActiveDeck, rowToEvent, rowToMovie, rowsToConfig, rowsToCuratedDecks, rowsToEffectiveAtoms } from './rows';

export interface SupabaseRestOptions {
  url: string;
  anonKey: string;
  /** JWT de la persona (Authorization: Bearer …). Sin él, solo se puede leer el catálogo. */
  accessToken?: string;
  fetch?: typeof fetch;
}

export class SupabaseRestRepository implements KinooRepository {
  private readonly f: typeof fetch;
  constructor(private readonly o: SupabaseRestOptions) {
    this.f = o.fetch ?? fetch;
  }

  private headers(extra: Record<string, string> = {}) {
    return { apikey: this.o.anonKey, Authorization: `Bearer ${this.o.accessToken ?? this.o.anonKey}`, 'content-type': 'application/json', ...extra };
  }

  private async get(table: string, query = 'select=*'): Promise<Record<string, unknown>[]> {
    const r = await this.f(`${this.o.url}/rest/v1/${table}?${query}`, { headers: this.headers() });
    if (!r.ok) throw new Error(`Supabase ${table}: ${r.status} ${await r.text()}`);
    return r.json();
  }

  private async write(table: string, rows: unknown[], upsertOn?: string): Promise<void> {
    if (!rows.length) return;
    const url = `${this.o.url}/rest/v1/${table}${upsertOn ? `?on_conflict=${upsertOn}` : ''}`;
    const prefer = upsertOn ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal';
    const r = await this.f(url, { method: 'POST', headers: this.headers({ Prefer: prefer }), body: JSON.stringify(rows) });
    if (!r.ok) throw new Error(`Supabase ${table}: ${r.status} ${await r.text()}`);
  }

  async loadCatalog(): Promise<CatalogData> {
    const [atoms, vibes, action_weights, deck_recipes, explanation_templates, archetypes, config, movies, effective, decks, items] = await Promise.all([
      this.get('atoms'),
      this.get('vibes'),
      this.get('action_weights'),
      this.get('deck_recipes'),
      this.get('explanation_templates'),
      this.get('archetypes'),
      this.get('config'),
      this.get('movies'),
      this.get('movie_effective_atoms', 'select=*&votes=gt.0'),
      this.get('decks', 'select=*&owner_kind=in.(system,curator)'),
      this.get('deck_items'),
    ]);
    return {
      config: rowsToConfig({ atoms, vibes, action_weights, deck_recipes, explanation_templates, archetypes, config }),
      movies: movies.map(rowToMovie),
      curatedDecks: rowsToCuratedDecks(decks, items),
      effectiveAtoms: rowsToEffectiveAtoms(effective),
    };
  }

  async loadUser(userId: string): Promise<UserSnapshot> {
    const id = encodeURIComponent(userId);
    const [events, decks, follows] = await Promise.all([
      this.get('events', `select=*&user_id=eq.${id}&order=at.asc`),
      this.get('active_decks', `select=*&user_id=eq.${id}&order=opened_at.desc&limit=1`),
      this.get('follows', `select=followee_id&follower_id=eq.${id}`),
    ]);
    return {
      user_id: userId,
      events: events.map(rowToEvent),
      active_deck: rowToActiveDeck(decks[0]),
      followed_curator_ids: follows.map((f) => f.followee_id as string),
    };
  }

  async saveUser(_userId: string, c: UserChanges): Promise<void> {
    await this.write('events', c.newEvents.map(eventToRow));
    if (c.deckChanged && c.activeDeck) await this.write('active_decks', [activeDeckToRow(c.activeDeck)], 'deck_id');
    await this.write('user_taste_profiles', [c.derived.taste], 'user_id');
    await this.write('user_vibe_recipes', c.derived.vibes, 'user_id,vibe');
    await this.write('user_movie_state', c.derived.states, 'user_id,movie_id');
  }
}
