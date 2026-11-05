// Comprueba que site/ publica todas las rutas que publicaba el prototipo antes de la reorganización.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rutas = readFileSync(path.join(root, 'scripts/rutas-publicadas.txt'), 'utf8').split('\n').filter(Boolean);
const faltan = rutas.filter((r) => !existsSync(path.join(root, 'site', r)));
if (faltan.length) {
  console.error(`Faltan ${faltan.length} rutas en site/:\n` + faltan.join('\n'));
  process.exit(1);
}
console.log(`OK: las ${rutas.length} rutas publicadas siguen en site/`);
