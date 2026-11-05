// Inventario de pósters: revisa apps/web/public/posters/ y escribe packages/catalog/data/posters.json.
// Convención: un archivo por película, con el id de Kinoo como nombre: posters/<id>.jpg (o .png / .webp).
//   npm run catalog:posters          → actualiza el inventario y lista las películas sin póster
//   npm run catalog:posters -- --check → falla si el inventario no está al día (CI)
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { p, readJson } from './lib.mjs';

const dir = p('apps/web/public/posters');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)) : [];
const byId = new Map(files.map((f) => [f.replace(/\.(jpe?g|png|webp)$/i, ''), f]));
const source = readJson('packages/catalog/data/source_movies.json').movies;
const ids = new Set(source.map((m) => m.id));

const posters = {};
for (const m of [...source].sort((a, b) => a.id.localeCompare(b.id))) {
  const f = byId.get(m.id);
  posters[m.id] = f ? { path: `posters/${f}`, origin: 'local' } : m.poster_path ? { path: m.poster_path, origin: 'tmdb' } : null;
}
const orphans = [...byId.keys()].filter((id) => !ids.has(id));
const out = {
  _doc: 'GENERADO por packages/catalog/scripts/posters.mjs. Para agregar un póster, guarda el archivo en apps/web/public/posters/<id>.jpg y corre npm run catalog:posters. "local" = archivo del repositorio (ruta relativa a la raíz del sitio); "tmdb" = poster_path de TMDB (se sirve desde image.tmdb.org).',
  posters,
  missing: Object.keys(posters).filter((id) => !posters[id]),
  orphans,
};
const text = JSON.stringify(out, null, 2) + '\n';
const target = p('packages/catalog/data/posters.json');
if (process.argv.includes('--check')) {
  if (!existsSync(target) || readFileSync(target, 'utf8') !== text) {
    console.error('posters.json no está al día: corre npm run catalog:posters');
    process.exit(1);
  }
  console.log('posters.json al día');
} else {
  writeFileSync(target, text);
  console.log(
    `${Object.values(posters).filter(Boolean).length} con póster · ${out.missing.length} sin póster${out.missing.length ? `: ${out.missing.join(', ')}` : ''}${orphans.length ? ` · archivos sin película: ${orphans.join(', ')}` : ''}`,
  );
}
