import { describe, expect, it, beforeAll } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, freshDb } from './test/db';

const ANA = '11111111-1111-4111-8111-111111111111';
const LEO = '22222222-2222-4222-8222-222222222222';
const ATOMS = { frenetica: 0.1, melancolica: 0.9 };

async function insertMovie(db: PGlite, id = 'm1') {
  await db.query(
    `insert into movies (id, title, year, runtime_min, atoms, hook, tagger_model, prompt_version, tagged_at) values ($1, 'Prueba', 2020, 100, $2, 'UNA FRASE', 'test', 'v0', now()) on conflict do nothing`,
    [id, JSON.stringify(ATOMS)],
  );
}

describe('migraciones de Supabase (PGlite)', () => {
  let db: PGlite;
  beforeAll(async () => { db = await freshDb(); await insertMovie(db); });

  it('se aplican desde cero y crean todas las tablas del plan', async () => {
    const r = await db.query<{ table_name: string }>(`select table_name from information_schema.tables where table_schema = 'public'`);
    const names = r.rows.map((x) => x.table_name);
    for (const t of ['atoms', 'movies', 'movie_atom_votes', 'vibes', 'tarot_archetypes', 'action_weights', 'deck_recipes', 'explanation_templates', 'config', 'events', 'user_taste_profiles', 'user_vibe_recipes', 'user_movie_state', 'active_decks', 'consents', 'profiles', 'follows', 'decks', 'deck_items', 'lists', 'groups', 'group_members']) {
      expect(names, t).toContain(t);
    }
  });

  it('la semilla de configuración carga 21 átomos, los moods y los pesos', async () => {
    expect((await db.query<{ n: number }>('select count(*)::int as n from atoms')).rows[0]!.n).toBe(21);
    expect((await db.query<{ n: number }>('select count(*)::int as n from vibes where active')).rows[0]!.n).toBeGreaterThanOrEqual(5);
    const w = await db.query<{ signal: number }>(`select signal from action_weights where action = 'watch_confirmed' and variant = 'loved'`);
    expect(w.rows[0]!.signal).toBeCloseTo(1.0);
  });

  it('movies tiene la columna de embedding (pgvector) y rechaza átomos desconocidos o fuera de rango', async () => {
    const c = await db.query<{ udt_name: string }>(`select udt_name from information_schema.columns where table_name = 'movies' and column_name = 'embedding'`);
    expect(c.rows[0]!.udt_name).toBe('vector');
    await expect(db.query(`insert into movies (id, title, atoms, hook, tagger_model, prompt_version, tagged_at) values ('x', 'x', '{"inventado": 0.5}', 'H', 't', 'v', now())`)).rejects.toThrow();
    await expect(db.query(`insert into movies (id, title, atoms, hook, tagger_model, prompt_version, tagged_at) values ('y', 'y', '{"humor": 1.5}', 'H', 't', 'v', now())`)).rejects.toThrow();
  });

  it('las plantillas de explicación no aceptan números ni %', async () => {
    await expect(db.query(`insert into explanation_templates (key, text) values ('mala', 'Te gusta al 93%')`)).rejects.toThrow();
  });

  it('events es solo de agregar: no se puede editar ni borrar', async () => {
    await db.query(`insert into events (id, user_id, type, movie_id, payload) values (gen_random_uuid(), $1, 'saved_intent', 'm1', '{"flipped": false}')`, [ANA]);
    await expect(db.query(`update events set type = 'dismissed'`)).rejects.toThrow(/solo de agregar/);
    await expect(db.query(`delete from events`)).rejects.toThrow(/solo de agregar/);
  });

  it('RLS: una persona no puede leer los eventos de otra', async () => {
    await asUser(db, LEO, () => db.query(`insert into events (id, user_id, type, movie_id, payload) values (gen_random_uuid(), $1, 'dismissed', 'm1', '{}')`, [LEO]));
    const leoSees = await asUser(db, LEO, () => db.query<{ user_id: string }>('select user_id from events'));
    expect(leoSees.rows.length).toBe(1);
    expect(leoSees.rows.every((r) => r.user_id === LEO)).toBe(true);
    const anaSees = await asUser(db, ANA, () => db.query<{ user_id: string }>('select user_id from events'));
    expect(anaSees.rows.every((r) => r.user_id === ANA)).toBe(true);
    expect(anaSees.rows.length).toBe(1);
  });

  it('RLS: nadie puede escribir eventos a nombre de otra persona', async () => {
    await expect(asUser(db, ANA, () => db.query(`insert into events (id, user_id, type, payload) values (gen_random_uuid(), $1, 'deck_opened', '{}')`, [LEO]))).rejects.toThrow();
  });

  it('RLS: perfiles y recetas de otra persona son invisibles; el catálogo es público', async () => {
    await db.query(`insert into user_taste_profiles (user_id, vector) values ($1, '{"humor": 0.4}')`, [ANA]);
    const leo = await asUser(db, LEO, () => db.query('select * from user_taste_profiles'));
    expect(leo.rows.length).toBe(0);
    const ana = await asUser(db, ANA, () => db.query('select * from user_taste_profiles'));
    expect(ana.rows.length).toBe(1);
    const movies = await asUser(db, LEO, () => db.query('select id from movies'));
    expect(movies.rows.length).toBeGreaterThan(0);
  });

  it('corrección comunitaria: combina el valor del LLM con los votos sin borrarlo', async () => {
    await db.query(`insert into movie_atom_votes (movie_id, atom, user_id, value) values ('m1', 'melancolica', $1, 0.1)`, [ANA]);
    const r = await db.query<{ value: number; votes: number }>(`select value, votes::int from movie_effective_atoms where movie_id = 'm1' and atom = 'melancolica'`);
    // (10·0,9 + 0,1) / 11 = 0,827
    expect(r.rows[0]!.value).toBeCloseTo(0.827, 2);
    const raw = await db.query<{ v: number }>(`select (atoms->>'melancolica')::real as v from movies where id = 'm1'`);
    expect(raw.rows[0]!.v).toBeCloseTo(0.9);
  });

  it('privacidad: cada persona exporta y borra solo lo suyo', async () => {
    const exp = await asUser(db, ANA, () => db.query<{ d: { events: unknown[] } }>('select kinoo_export_my_data() as d'));
    expect(exp.rows[0]!.d.events.length).toBe(1);
    await asUser(db, LEO, () => db.query('select kinoo_delete_my_data()'));
    const left = await db.query<{ user_id: string }>('select distinct user_id from events');
    expect(left.rows.map((r) => r.user_id)).toEqual([ANA]);
  });
});
