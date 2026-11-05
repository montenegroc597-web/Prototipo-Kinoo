// Trae el catálogo piloto desde TMDB (12.1 y 12.2). Requiere TMDB_API_KEY y acceso de red a api.themoviedb.org.
//   node scripts/catalog/fetch-tmdb.mjs [--target 300] [--country CO]
// Escribe data/catalog/tmdb_movies.json con el mismo formato que seed_movies.json (más overview, cast y keywords).
// Después: tag.mjs prompts --input data/catalog/tmdb_movies.json → etiquetar → build.mjs --input data/catalog/tmdb_movies.json --source tmdb
//
// Cuotas (supuesto de la especificación): ≥ 15 % latinoamericanas, ≥ 20 % anteriores al 2000, todos los géneros.
// Solo entran películas con alguna plataforma de suscripción (flatrate) en el país.
import { arg, readJson, writeJson } from './lib.mjs';

const KEY = process.env.TMDB_API_KEY;
if (!KEY) { console.error('Falta TMDB_API_KEY (ver .env.example). El catálogo queda en la semilla manual.'); process.exit(2); }
const TARGET = Number(arg('target', '300'));
const COUNTRY = arg('country', 'CO');
const LATAM = ['AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'GT', 'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE'];
const base = 'https://api.themoviedb.org/3';
// Acepta clave v3 (api_key) o token v4 (Bearer).
const auth = KEY.length > 40 ? { headers: { Authorization: `Bearer ${KEY}` } } : null;
async function get(path, params = {}) {
  const u = new URL(base + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  if (!auth) u.searchParams.set('api_key', KEY);
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u, auth ?? {});
    if (r.status === 429) { await new Promise((s) => setTimeout(s, 1000 * 2 ** i)); continue; }
    if (!r.ok) throw new Error(`${r.status} ${path}`);
    return r.json();
  }
  throw new Error(`429 persistente en ${path}`);
}

const genres = new Map((await get('/genre/movie/list', { language: 'es' })).genres.map((g) => [g.id, g.name]));
const pool = new Map();
async function discover(params, pages) {
  for (let page = 1; page <= pages; page++) {
    const r = await get('/discover/movie', { watch_region: COUNTRY, with_watch_monetization_types: 'flatrate', language: 'es', page, 'vote_count.gte': 200, ...params });
    for (const m of r.results) if (!pool.has(m.id)) pool.set(m.id, m);
  }
}
await discover({ sort_by: 'popularity.desc' }, 10);
await discover({ sort_by: 'vote_average.desc', 'vote_count.gte': 1000 }, 8);
await discover({ sort_by: 'popularity.desc', 'primary_release_date.lte': '1999-12-31' }, 6);
for (const c of ['MX', 'AR', 'CO', 'BR', 'CL']) await discover({ sort_by: 'popularity.desc', with_origin_country: c, 'vote_count.gte': 50 }, 2);
for (const g of genres.keys()) await discover({ sort_by: 'popularity.desc', with_genres: g }, 1);

const details = [];
for (const m of pool.values()) {
  const d = await get(`/movie/${m.id}`, { language: 'es', append_to_response: 'credits,keywords,watch/providers,reviews' });
  const prov = d['watch/providers']?.results?.[COUNTRY]?.flatrate?.map((x) => x.provider_name) ?? [];
  if (!prov.length || !d.runtime) continue;
  details.push({
    id: `${(d.original_title || d.title).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${(d.release_date || '').slice(0, 4)}`,
    tmdb_id: d.id, title: d.title, original_title: d.original_title, year: Number((d.release_date || '0').slice(0, 4)), runtime_min: d.runtime,
    genres: d.genres.map((g) => g.name), directors: d.credits.crew.filter((c) => c.job === 'Director').map((c) => c.name),
    cast: d.credits.cast.slice(0, 8).map((c) => c.name), countries: d.production_countries.map((c) => c.iso_3166_1), original_language: d.original_language,
    vote_average: d.vote_average, vote_count: d.vote_count, popularity: d.popularity, poster_path: d.poster_path, overview: d.overview,
    keywords: (d.keywords?.keywords ?? []).map((k) => k.name).slice(0, 15),
    reviews: (d.reviews?.results ?? []).slice(0, 2).map((r) => r.content.slice(0, 600)),
    providers: { [COUNTRY]: prov },
  });
}

// Selección con cuotas: primero las cuotas, luego por popularidad × calidad.
const score = (m) => Math.log10(1 + m.vote_count) * m.vote_average;
const ranked = details.sort((a, b) => score(b) - score(a));
const chosen = new Map();
const take = (xs, n) => { for (const m of xs) { if (chosen.size >= TARGET || n <= 0) break; if (!chosen.has(m.id)) { chosen.set(m.id, m); n--; } } };
take(ranked.filter((m) => m.countries.some((c) => LATAM.includes(c))), Math.ceil(TARGET * 0.15));
take(ranked.filter((m) => m.year < 2000), Math.ceil(TARGET * 0.2));
for (const g of genres.values()) take(ranked.filter((m) => m.genres.includes(g)), 3);
// Las del prototipo y las del protocolo de pruebas siempre entran si están en TMDB con plataforma.
const seedTitles = new Set(readJson('data/catalog/seed_movies.json').movies.map((m) => (m.original_title || m.title).toLowerCase()));
take(ranked.filter((m) => seedTitles.has((m.original_title || m.title).toLowerCase())), TARGET);
take(ranked, TARGET);

const movies = [...chosen.values()];
writeJson('data/catalog/tmdb_movies.json', { _doc: 'Generado por scripts/catalog/fetch-tmdb.mjs. Datos de TMDB; plataformas de JustWatch vía TMDB.', fetched_at: new Date().toISOString(), country: COUNTRY, movies });
const latam = movies.filter((m) => m.countries.some((c) => LATAM.includes(c))).length;
console.log(`${movies.length} películas · latinoamericanas ${latam} · antes de 2000 ${movies.filter((m) => m.year < 2000).length}`);
