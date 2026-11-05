import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Las rutas que publicaba public/ antes de la reorganización deben seguir existiendo en apps/web/.
describe('estructura del front', () => {
  it('apps/web conserva todas las rutas publicadas', () => {
    const root = path.resolve(__dirname, '..');
    const rutas = readFileSync(path.join(root, 'scripts/rutas-publicadas.txt'), 'utf8').split('\n').filter(Boolean);
    expect(rutas.length).toBe(86);
    const faltan = rutas.filter((r) => !existsSync(path.join(root, 'apps/web', r)));
    expect(faltan).toEqual([]);
  });
});
