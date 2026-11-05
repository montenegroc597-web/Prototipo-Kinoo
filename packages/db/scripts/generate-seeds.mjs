// Genera las semillas SQL desde la fuente editable (packages/config/data/*.json y packages/catalog/data/movies.pilot.json).
// Uso: npm run db:seeds            → escribe packages/db/seeds/*.sql
//      npm run seed -- --check → falla si las semillas no están al día (para CI)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const j = (p) => JSON.parse(readFileSync(path.join(root, p), 'utf8'));
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const jb = (v) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (a) => `array[${(a || []).map(q).join(',')}]::text[]`;

function configSql() {
  const out = ['-- GENERADO por packages/db/scripts/generate-seeds.mjs desde packages/config/data/. No editar a mano.', 'begin;'];
  const atoms = j('packages/config/data/atoms.json').atoms;
  out.push('delete from atoms where key not in (' + atoms.map((a) => q(a.key)).join(',') + ');');
  atoms.forEach((a, i) =>
    out.push(
      `insert into atoms (key, dimension, label, description, sort_order) values (${q(a.key)}, ${q(a.dimension)}, ${q(a.label)}, ${q(a.description)}, ${i + 1}) on conflict (key) do update set dimension = excluded.dimension, label = excluded.label, description = excluded.description, sort_order = excluded.sort_order;`,
    ),
  );
  for (const v of j('packages/config/data/vibes.json').vibes) {
    out.push(
      `insert into vibes (key, name, definition, aliases, recipe, quality_weight, example_movie_ids, active, version) values (${q(v.key)}, ${q(v.name)}, ${q(v.definition)}, ${arr(v.aliases)}, ${jb(v.recipe)}, ${v.quality_weight ?? 'null'}, ${arr(v.example_movie_ids)}, ${v.active}, ${v.version}) on conflict (key) do update set name = excluded.name, definition = excluded.definition, aliases = excluded.aliases, recipe = excluded.recipe, quality_weight = excluded.quality_weight, example_movie_ids = excluded.example_movie_ids, active = excluded.active, version = excluded.version, updated_at = now();`,
    );
  }
  for (const a of j('packages/config/data/archetypes.json').archetypes) {
    out.push(
      `insert into archetypes (key, name, recipe) values (${q(a.key)}, ${q(a.name)}, ${jb(a.recipe)}) on conflict (key) do update set name = excluded.name, recipe = excluded.recipe;`,
    );
  }
  for (const w of j('packages/config/data/action_weights.json').weights) {
    out.push(
      `insert into action_weights (action, variant, signal, eta, reason) values (${q(w.action)}, ${q(w.variant)}, ${w.signal}, ${w.eta}, ${q(w.reason)}) on conflict (action, variant) do update set signal = excluded.signal, eta = excluded.eta, reason = excluded.reason;`,
    );
  }
  for (const r of j('packages/config/data/deck_recipes.json').recipes) {
    out.push(
      `insert into deck_recipes (size, is_default, slots) values (${r.size}, ${!!r.default}, ${jb(r.slots)}) on conflict (size) do update set is_default = excluded.is_default, slots = excluded.slots;`,
    );
  }
  for (const t of j('packages/config/data/explanation_templates.json').templates) {
    out.push(`insert into explanation_templates (key, text) values (${q(t.key)}, ${q(t.text)}) on conflict (key) do update set text = excluded.text;`);
  }
  for (const [k, v] of Object.entries(j('packages/config/data/params.json'))) {
    if (k.startsWith('_')) continue;
    out.push(`insert into config (key, value) values (${q(k)}, ${jb(v)}) on conflict (key) do update set value = excluded.value, updated_at = now();`);
  }
  out.push('commit;', '');
  return out.join('\n');
}

function catalogSql() {
  const file = path.join(root, 'packages/catalog/data/movies.pilot.json');
  if (!existsSync(file)) return null;
  const { movies, stats, team_deck } = JSON.parse(readFileSync(file, 'utf8'));
  const out = ['-- GENERADO por packages/db/scripts/generate-seeds.mjs desde packages/catalog/data/movies.pilot.json. No editar a mano.', 'begin;'];
  for (const m of movies) {
    out.push(
      `insert into movies (id, tmdb_id, imdb_id, keywords, title, original_title, year, runtime_min, genres, directors, countries, original_language, vote_average, vote_count, popularity, poster_path, overview, atoms, hook, pillars, providers, tagger_model, prompt_version, tagged_at, source) values (${q(m.id)}, ${m.tmdb_id ?? 'null'}, ${q(m.imdb_id)}, ${arr(m.keywords)}, ${q(m.title)}, ${q(m.original_title)}, ${m.year}, ${m.runtime_min}, ${arr(m.genres)}, ${arr(m.directors)}, ${arr(m.countries)}, ${q(m.original_language)}, ${m.vote_average}, ${m.vote_count}, ${m.popularity ?? 'null'}, ${q(m.poster_path)}, ${q(m.overview)}, ${jb(m.atoms)}, ${q(m.hook)}, ${jb(m.pillars)}, ${jb(m.providers)}, ${q(m.tagger.model)}, ${q(m.tagger.prompt_version)}, ${q(m.tagger.tagged_at)}, ${q(m.source)}) on conflict (id) do update set atoms = excluded.atoms, hook = excluded.hook, pillars = excluded.pillars, providers = excluded.providers, tagger_model = excluded.tagger_model, prompt_version = excluded.prompt_version, tagged_at = excluded.tagged_at, imdb_id = excluded.imdb_id, keywords = excluded.keywords, overview = excluded.overview, vote_average = excluded.vote_average, vote_count = excluded.vote_count;`,
    );
  }
  if (stats)
    for (const [atom, s] of Object.entries(stats)) {
      out.push(
        `insert into catalog_atom_stats (atom, mean, stddev) values (${q(atom)}, ${s.mean}, ${s.stddev}) on conflict (atom) do update set mean = excluded.mean, stddev = excluded.stddev, computed_at = now();`,
      );
    }
  if (team_deck) {
    out.push(
      `insert into decks (id, owner_kind, owner_id, owner_name, title, visibility) values (${q(team_deck.uuid)}, 'system', null, ${q(team_deck.owner_name)}, ${q(team_deck.title)}, 'public') on conflict (id) do update set title = excluded.title;`,
    );
    team_deck.movie_ids.forEach((id, i) =>
      out.push(
        `insert into deck_items (deck_id, movie_id, position, note) values (${q(team_deck.uuid)}, ${q(id)}, ${i + 1}, ${q(team_deck.notes?.[id])}) on conflict do nothing;`,
      ),
    );
  }
  out.push('commit;', '');
  return out.join('\n');
}

const outputs = { 'packages/db/seeds/001_config.sql': configSql(), 'packages/db/seeds/002_catalogo.sql': catalogSql() };
const check = process.argv.includes('--check');
let stale = false;
for (const [rel, sql] of Object.entries(outputs)) {
  if (sql === null) continue;
  const file = path.join(root, rel);
  if (check) {
    if (!existsSync(file) || readFileSync(file, 'utf8') !== sql) {
      console.error(`Desactualizada: ${rel} (corre npm run db:seeds)`);
      stale = true;
    }
  } else {
    writeFileSync(file, sql);
    console.log(`escrito ${rel}`);
  }
}
if (stale) process.exit(1);
