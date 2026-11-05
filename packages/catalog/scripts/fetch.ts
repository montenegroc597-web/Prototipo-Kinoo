// Paso 1 del pipeline: trae el catálogo desde TMDB y lo deja en data/source_movies.json.
//   npm run catalog:fetch                      → con TMDB_API_KEY usa la API real; sin ella, la simulación (fixtures)
//   npm run catalog:fetch -- --source fixtures → fuerza la simulación
//   npm run catalog:fetch -- --target 300 --country CO
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fetchCatalog, fixtureTransport, httpTransport, quotaReport } from '../src';
import { CATALOG_DIR, loadTmdbFixtures } from '../src/fixtures';

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const key = process.env.TMDB_API_KEY;
const source = arg('source', key ? 'tmdb' : 'fixtures');
if (source === 'tmdb' && !key) {
  console.error('Falta TMDB_API_KEY (ver .env.example). Usa --source fixtures para la simulación.');
  process.exit(2);
}
const transport = source === 'tmdb' ? httpTransport(key!) : fixtureTransport(loadTmdbFixtures());
const country = arg('country', 'CO');
const target = Number(arg('target', source === 'tmdb' ? '300' : String(transport.kind === 'fixtures' ? loadTmdbFixtures().length : 300)));

const movies = await fetchCatalog(transport, { target, country, onProgress: (m) => console.log(m) });
const out = {
  _doc: 'Generado por packages/catalog/scripts/fetch.ts. No editar a mano: vuelve a correr npm run catalog:fetch.',
  source: transport.kind === 'http' ? 'tmdb' : 'tmdb_simulado',
  fetched_at: transport.kind === 'http' ? new Date().toISOString() : '2026-11-05T00:00:00.000Z',
  country,
  attribution: 'Datos de películas: TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Plataformas: JustWatch.',
  quotas: quotaReport(movies),
  movies: movies.sort((a, b) => a.id.localeCompare(b.id)),
};
writeFileSync(path.join(CATALOG_DIR, 'data/source_movies.json'), JSON.stringify(out, null, 2) + '\n');
const q = out.quotas;
console.log(`${q.total} películas (${out.source}) · latinoamericanas ${q.latam} · antes de 2000 ${q.pre2000} · ${q.genres} géneros → data/source_movies.json`);
