// Repositorio sobre PostgreSQL directo (pg o PGlite). Sirve para Supabase (conexión directa) y para cualquier otra nube.
// Cada petición de una persona corre en una transacción con su identidad, así RLS aplica igual que desde el cliente.
import type { CatalogData, KinooRepository, UserChanges, UserSnapshot } from '@kinoo/core';
import { activeDeckToRow, eventToRow, rowToActiveDeck, rowToEvent, rowToMovie, rowsToConfig, rowsToCuratedDecks, rowsToEffectiveAtoms } from './rows';
import type { SqlClient, SqlRunner } from './sql';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PostgresRepository implements KinooRepository {
  constructor(private readonly db: SqlClient) {}

  async loadCatalog(): Promise<CatalogData> {
    const q = async (t: string) => (await this.db.query<Record<string, unknown>>(t)).rows;
    const [atoms, vibes, action_weights, deck_recipes, explanation_templates, archetypes, config, movies, effective, decks, items] = await Promise.all([
      q('select * from atoms'),
      q('select * from vibes'),
      q('select * from action_weights'),
      q('select * from deck_recipes'),
      q('select * from explanation_templates'),
      q('select * from archetypes'),
      q('select * from config'),
      q('select * from movies'),
      q('select * from movie_effective_atoms where votes > 0'),
      q(`select * from decks where owner_kind in ('system', 'curator')`),
      q('select * from deck_items'),
    ]);
    return {
      config: rowsToConfig({ atoms, vibes, action_weights, deck_recipes, explanation_templates, archetypes, config }),
      movies: movies.map(rowToMovie),
      curatedDecks: rowsToCuratedDecks(decks, items),
      effectiveAtoms: rowsToEffectiveAtoms(effective),
    };
  }

  /** Corre fn con la identidad de la persona (rol authenticated + app.user_id + claim de Supabase). */
  private asUser<T>(userId: string, fn: (tx: SqlRunner) => Promise<T>): Promise<T> {
    if (!UUID.test(userId)) throw new Error('El id de usuario debe ser un UUID');
    return this.db.transaction(async (tx) => {
      await tx.exec('set local role authenticated');
      await tx.query(`select set_config('app.user_id', $1, true), set_config('request.jwt.claim.sub', $1, true)`, [userId]);
      return fn(tx);
    });
  }

  loadUser(userId: string): Promise<UserSnapshot> {
    return this.asUser(userId, async (tx) => {
      const events = (await tx.query<Record<string, unknown>>('select * from events where user_id = $1 order by at', [userId])).rows;
      const deck = (await tx.query<Record<string, unknown>>('select * from active_decks where user_id = $1 order by opened_at desc limit 1', [userId])).rows[0];
      const follows = (await tx.query<{ followee_id: string }>('select followee_id from follows where follower_id = $1', [userId])).rows;
      return { user_id: userId, events: events.map(rowToEvent), active_deck: rowToActiveDeck(deck), followed_curator_ids: follows.map((f) => f.followee_id) };
    });
  }

  saveUser(userId: string, c: UserChanges): Promise<void> {
    return this.asUser(userId, async (tx) => {
      for (const e of c.newEvents.map(eventToRow)) {
        await tx.query('insert into events (id, user_id, type, movie_id, at, context, payload) values ($1, $2, $3, $4, $5, $6, $7)', [
          e.id,
          e.user_id,
          e.type,
          e.movie_id,
          e.at,
          JSON.stringify(e.context),
          JSON.stringify(e.payload),
        ]);
      }
      if (c.deckChanged && c.activeDeck) {
        const d = activeDeckToRow(c.activeDeck);
        await tx.query(
          `insert into active_decks (deck_id, user_id, vibe, size, opened_at, completed_at, cards, profile_before, special_used)
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          on conflict (deck_id) do update set completed_at = excluded.completed_at, cards = excluded.cards, special_used = excluded.special_used`,
          [d.deck_id, d.user_id, d.vibe, d.size, d.opened_at, d.completed_at, JSON.stringify(d.cards), JSON.stringify(d.profile_before), d.special_used],
        );
      }
      const t = c.derived.taste;
      await tx.query(
        `insert into user_taste_profiles (user_id, vector, signal_count, formula_version, updated_at) values ($1, $2, $3, $4, now())
        on conflict (user_id) do update set vector = excluded.vector, signal_count = excluded.signal_count, formula_version = excluded.formula_version, updated_at = now()`,
        [userId, JSON.stringify(t.vector), t.signal_count, t.formula_version],
      );
      for (const v of c.derived.vibes) {
        await tx.query(
          `insert into user_vibe_recipes (user_id, vibe, recipe, seed_version, signal_count, updated_at) values ($1, $2, $3, $4, $5, now())
          on conflict (user_id, vibe) do update set recipe = excluded.recipe, signal_count = excluded.signal_count, updated_at = now()`,
          [userId, v.vibe, JSON.stringify(v.recipe), v.seed_version, v.signal_count],
        );
      }
      for (const s of c.derived.states) {
        await tx.query(
          `insert into user_movie_state (user_id, movie_id, state, special_match, saved_at, updated_at) values ($1, $2, $3, $4, $5, $6)
          on conflict (user_id, movie_id) do update set state = excluded.state, special_match = excluded.special_match, saved_at = excluded.saved_at, updated_at = excluded.updated_at`,
          [userId, s.movie_id, s.state, s.special_match, s.saved_at, s.updated_at],
        );
      }
    });
  }
}
