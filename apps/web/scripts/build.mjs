import { cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Arma dist/: lo que se publica en GitHub Pages.
// 1) Copia public/ tal cual (mismas rutas que el prototipo publicó siempre).
// 2) Empaqueta el modo demo (src/demo.ts: motor + catálogo + configuración) en dist/_kinoo/kinoo-demo.js.
import { build } from 'esbuild';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(web, '../..');
const dist = path.join(web, 'dist');

rmSync(dist, { recursive: true, force: true });
cpSync(path.join(web, 'public'), dist, { recursive: true });

// Inicio de sesión de la demo (entrar.html): pequeño, sin el motor.
await build({
  entryPoints: [path.join(web, 'src/login.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2019',
  minify: true,
  outfile: path.join(dist, '_kinoo/kinoo-login.js'),
  logLevel: 'warning',
});

await build({
  entryPoints: [path.join(web, 'src/demo.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2019',
  minify: true,
  sourcemap: true,
  outfile: path.join(dist, '_kinoo/kinoo-demo.js'),
  alias: {
    '@kinoo/shared': path.join(root, 'packages/shared/src/index.ts'),
    '@kinoo/config': path.join(root, 'packages/config/src/index.ts'),
    '@kinoo/engine': path.join(root, 'packages/engine/src/index.ts'),
    '@kinoo/core': path.join(root, 'packages/core/src/index.ts'),
  },
  logLevel: 'warning',
});
console.log('apps/web/dist listo');
