// Utilidades compartidas del pipeline del catálogo.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const p = (...x) => path.join(root, ...x);
export const readJson = (f) => JSON.parse(readFileSync(p(f), 'utf8'));
export const writeJson = (f, d) => {
  mkdirSync(path.dirname(p(f)), { recursive: true });
  writeFileSync(p(f), JSON.stringify(d, null, 2) + '\n');
};
export const ATOMS = readJson('packages/config/data/atoms.json').atoms;
export const ATOM_KEYS = ATOMS.map((a) => a.key);
export const PROMPT_VERSION = 'juez-v2.0';
export const PILLARS = ['ritmo', 'tono', 'historia', 'visual'];

export function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}
