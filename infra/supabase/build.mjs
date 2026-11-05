import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Prepara infra/supabase para el CLI de Supabase:
//  1) empaqueta la API (apps/api/src/edge.supabase.ts) en functions/_shared/kinoo-api.js (Deno no resuelve los paquetes del monorepo);
//  2) copia las migraciones portátiles (packages/db) a migrations/, con el proveedor de Supabase primero;
//  3) junta las semillas en seed.sql.
// Los tres resultados son generados (están en .gitignore). Uso: npm run supabase:build
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const db = path.join(root, 'packages/db');

await build({
  entryPoints: [path.join(root, 'apps/api/src/edge.supabase.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  outfile: path.join(here, 'functions/_shared/kinoo-api.js'),
  banner: { js: '// GENERADO por infra/supabase/build.mjs. No editar a mano.' },
  logLevel: 'warning',
});

const mig = path.join(here, 'migrations');
rmSync(mig, { recursive: true, force: true });
mkdirSync(mig, { recursive: true });
// El CLI de Supabase ordena por nombre: el proveedor va primero.
copyFileSync(path.join(db, 'providers/supabase.sql'), path.join(mig, '20261105000000_proveedor_supabase.sql'));
for (const f of readdirSync(path.join(db, 'migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()) {
  const n = f.match(/^(\d+)_(.+)$/);
  copyFileSync(path.join(db, 'migrations', f), path.join(mig, `2026110500${n[1].padStart(4, '0')}_${n[2]}`));
}
const seeds = readdirSync(path.join(db, 'seeds'))
  .filter((f) => f.endsWith('.sql'))
  .sort();
writeFileSync(path.join(here, 'seed.sql'), seeds.map((f) => `-- ${f}\n` + readFileSync(path.join(db, 'seeds', f), 'utf8')).join('\n'));
console.log('infra/supabase listo: functions/_shared/kinoo-api.js, migrations/, seed.sql');
