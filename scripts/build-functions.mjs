// Empaqueta el motor y el servicio para las Edge Functions (Deno) en supabase/functions/_shared/kinoo-core.js.
// Correr antes de `supabase functions deploy`.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({
  stdin: { contents: "export * from '@kinoo/api'; export * from '@kinoo/engine';", resolveDir: root, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'neutral', target: 'es2022',
  outfile: path.join(root, 'supabase/functions/_shared/kinoo-core.js'),
  alias: {
    '@kinoo/engine': path.join(root, 'packages/engine/src/index.ts'),
    '@kinoo/shared': path.join(root, 'packages/shared/src/index.ts'),
    '@kinoo/api': path.join(root, 'packages/api/src/index.ts'),
  },
  banner: { js: '// GENERADO por scripts/build-functions.mjs. No editar a mano.' },
  logLevel: 'warning',
});
console.log('supabase/functions/_shared/kinoo-core.js listo');
