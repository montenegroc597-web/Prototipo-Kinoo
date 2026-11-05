// Arma site/: lo que se publica en GitHub Pages.
// 1) Copia el prototipo (apps/web) tal cual: mismas rutas que antes publicaba public/.
// 2) Si existe el modo demo (apps/web/src/demo.ts), lo empaqueta con el motor en site/_kinoo/kinoo-demo.js.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'apps/web');
const site = path.join(root, 'site');

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
for (const entry of ['index.html', '.nojekyll', 'kinoo-flujo', '_prototipos', '_kinoo']) {
  const from = path.join(web, entry);
  if (existsSync(from)) cpSync(from, path.join(site, entry), { recursive: true });
}

const demoEntry = path.join(web, 'src/demo.ts');
if (existsSync(demoEntry)) {
  const { build } = await import('esbuild');
  await build({
    entryPoints: [demoEntry],
    bundle: true,
    format: 'iife',
    target: 'es2019',
    minify: true,
    outfile: path.join(site, '_kinoo/kinoo-demo.js'),
    alias: {
      '@kinoo/engine': path.join(root, 'packages/engine/src/index.ts'),
      '@kinoo/shared': path.join(root, 'packages/shared/src/index.ts'),
    },
    loader: { '.json': 'json' },
    logLevel: 'warning',
  });
}
console.log('site/ listo');
