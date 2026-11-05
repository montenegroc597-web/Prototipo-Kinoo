// Junta metadatos + etiquetas del juez, valida (12.3 y 12.4) y exporta el catálogo piloto.
//   node scripts/catalog/build.mjs [--input data/catalog/seed_movies.json] [--source semilla_manual]
// Escribe: data/catalog/movies.pilot.json, data/catalog/qc-report.md, data/catalog/revision-20.csv
// Después: npm run seed  (genera supabase/seed/002_catalogo.sql)
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { ATOM_KEYS, PILLARS, PROMPT_VERSION, arg, p, readJson, writeJson } from './lib.mjs';

const input = arg('input', 'data/catalog/seed_movies.json');
const source = arg('source', 'semilla_manual');
const meta = readJson(input).movies;
const tagged = new Map();
const batchDir = p('data/catalog/batches');
for (const f of existsSync(batchDir) ? readdirSync(batchDir).filter((f) => f.endsWith('.tagged.json')).sort() : []) {
  const b = readJson(`data/catalog/batches/${f}`);
  for (const m of b.movies) tagged.set(m.id, { ...m, tagger_model: b.tagger_model, prompt_version: b.prompt_version, tagged_at: b.tagged_at });
}

const errors = [];
const warnings = [];
const movies = [];
for (const m of meta) {
  const t = tagged.get(m.id);
  if (!t) { errors.push(`${m.id}: sin etiquetar`); continue; }
  const atoms = {};
  for (const k of ATOM_KEYS) {
    const v = t.atoms?.[k];
    if (typeof v !== 'number' || !(v >= 0 && v <= 1)) errors.push(`${m.id}: átomo ${k} inválido (${v})`);
    atoms[k] = Math.round(Number(v) * 100) / 100;
  }
  for (const k of Object.keys(t.atoms ?? {})) if (!ATOM_KEYS.includes(k)) errors.push(`${m.id}: átomo desconocido ${k}`);
  const hook = String(t.hook ?? '').trim().toUpperCase();
  if (!hook) errors.push(`${m.id}: sin frase gancho`);
  if (hook.length > 160) errors.push(`${m.id}: frase gancho de ${hook.length} caracteres (máx. 160)`);
  // Sin nombres del director ni del reparto (si TMDB lo trajo): se buscan apellidos y nombres de más de 3 letras.
  const names = [...m.directors, ...(m.cast ?? [])].flatMap((n) => n.split(/\s+/)).filter((w) => w.length > 3);
  for (const w of names) if (new RegExp(`\\b${w.toUpperCase()}\\b`, 'u').test(hook)) errors.push(`${m.id}: la frase gancho nombra a "${w}"`);
  const pillars = {};
  for (const k of PILLARS) {
    const v = String(t.pillars?.[k] ?? '').trim().toLowerCase();
    if (!v) errors.push(`${m.id}: falta el pilar ${k}`);
    pillars[k] = v;
  }
  if (atoms.frenetica > 0.8 && atoms.contemplativa > 0.8) warnings.push(`${m.id}: frenética y contemplativa por encima de 0,8`);
  movies.push({
    id: m.id, tmdb_id: m.tmdb_id ?? null, title: m.title, original_title: m.original_title ?? null, year: m.year, runtime_min: m.runtime_min,
    genres: m.genres, directors: m.directors, countries: m.countries, original_language: m.original_language,
    vote_average: m.vote_average, vote_count: m.vote_count, popularity: m.popularity ?? null, poster_path: m.poster_path ?? null, overview: m.overview ?? '',
    atoms, hook, pillars, providers: m.providers ?? {},
    tagger: { model: t.tagger_model ?? 'desconocido', prompt_version: t.prompt_version ?? PROMPT_VERSION, tagged_at: t.tagged_at ?? new Date().toISOString() },
    source,
  });
}

// Dispersión por átomo.
const stats = {};
for (const k of ATOM_KEYS) {
  const xs = movies.map((m) => m.atoms[k]);
  const mean = xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length || 1));
  stats[k] = { mean: +mean.toFixed(4), stddev: +sd.toFixed(4) };
}
const lowDispersion = ATOM_KEYS.filter((k) => stats[k].stddev < 0.15);

// Error de las anclas.
const anchors = existsSync(p('data/catalog/anchors.json')) ? readJson('data/catalog/anchors.json') : { anchors: [] };
const anchorErr = anchors.anchors.map((a) => {
  const m = movies.find((x) => x.id === a.id);
  if (!m) return { id: a.id, mae: null };
  const mae = ATOM_KEYS.reduce((s, k) => s + Math.abs(m.atoms[k] - a.atoms[k]), 0) / ATOM_KEYS.length;
  return { id: a.id, mae: +mae.toFixed(3) };
});
const valid = anchorErr.filter((x) => x.mae !== null);
const anchorMae = valid.length ? +(valid.reduce((s, x) => s + x.mae, 0) / valid.length).toFixed(3) : null;

// Mazo del equipo fundador (rol "creador" mientras no hay Comunidad). Provisional: lo debe curar el equipo.
const teamPick = existsSync(p('data/catalog/team_deck.json')) ? readJson('data/catalog/team_deck.json') : null;

const out = {
  generated_at: new Date().toISOString(), source, count: movies.length, prompt_version: PROMPT_VERSION,
  attribution: 'Datos de películas: semilla manual. Al usar TMDB: "This product uses the TMDB API but is not endorsed or certified by TMDB." Plataformas: JustWatch.',
  stats, team_deck: teamPick, movies,
};

const ok = !errors.length;
if (ok) writeJson('data/catalog/movies.pilot.json', out);

// CSV de revisión humana: 20 películas (las primeras en orden alfabético de id, para que sea estable).
const sample = [...movies].sort((a, b) => a.id.localeCompare(b.id)).filter((_, i, arr) => i % Math.max(1, Math.floor(arr.length / 20)) === 0).slice(0, 20);
const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const csv = [['id', 'titulo', 'anio', ...ATOM_KEYS, 'frase_gancho', ...PILLARS, 'comentario_del_equipo'].join(','),
  ...sample.map((m) => [m.id, esc(m.title), m.year, ...ATOM_KEYS.map((k) => m.atoms[k]), esc(m.hook), ...PILLARS.map((k) => esc(m.pillars[k])), ''].join(','))].join('\n') + '\n';
writeFileSync(p('data/catalog/revision-20.csv'), csv);

const md = ['# Control de calidad del catálogo', '', `Generado: ${out.generated_at} · fuente: ${source} · ${movies.length} películas`, '',
  '| Control | Resultado | Criterio | ¿Pasa? |', '|---|---|---|---|',
  `| Esquema y frases gancho | ${errors.length} errores | 0 errores | ${errors.length ? '❌' : '✅'} |`,
  `| Dispersión | ${lowDispersion.length ? `bajos: ${lowDispersion.join(', ')}` : 'todos ≥ 0,15'} | desviación ≥ 0,15 por átomo | ${lowDispersion.length ? '❌' : '✅'} |`,
  `| Contradicciones | ${warnings.length} alertas | frenética y contemplativa no ambas > 0,8 | ${warnings.length ? '⚠️' : '✅'} |`,
  `| Error de las anclas | ${anchorMae ?? 'sin anclas'} (${valid.map((x) => `${x.id}: ${x.mae}`).join(', ')}) | ≤ 0,15 | ${anchorMae !== null && anchorMae <= 0.15 ? '✅' : '❌'} |`,
  '', '## Desviación por átomo', '', '| Átomo | Promedio | Desviación |', '|---|---|---|',
  ...ATOM_KEYS.map((k) => `| ${k} | ${stats[k].mean} | ${stats[k].stddev} |`), '',
  ...(errors.length ? ['## Errores', '', ...errors.map((e) => `- ${e}`), ''] : []),
  ...(warnings.length ? ['## Alertas', '', ...warnings.map((e) => `- ${e}`), ''] : []),
];
writeFileSync(p('data/catalog/qc-report.md'), md.join('\n'));
console.log(md.slice(4, 10).join('\n'));
if (!ok) { console.error(errors.slice(0, 20).join('\n')); process.exit(1); }
