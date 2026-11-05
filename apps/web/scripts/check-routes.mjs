// Comprueba que dist/ publica todas las rutas que el prototipo publicaba antes de la v2 (lista en rutas-publicadas.txt).
// Si falta alguna, se romperían enlaces que ya se compartieron.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rutas = readFileSync(path.join(web, 'scripts/rutas-publicadas.txt'), 'utf8').split('\n').filter(Boolean);
const faltan = rutas.filter((r) => !existsSync(path.join(web, 'dist', r)));
if (faltan.length) {
  console.error(`Faltan ${faltan.length} rutas en dist/:\n${faltan.join('\n')}`);
  process.exit(1);
}
console.log(`OK: las ${rutas.length} rutas publicadas siguen en dist/`);
