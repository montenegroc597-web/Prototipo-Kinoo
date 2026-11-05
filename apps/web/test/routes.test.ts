import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Las rutas que el prototipo publicó siempre deben seguir existiendo en public/.
describe('rutas publicadas del front', () => {
  const web = path.resolve(__dirname, '..');
  const rutas = readFileSync(path.join(web, 'scripts/rutas-publicadas.txt'), 'utf8').split('\n').filter(Boolean);

  it('public/ conserva las 86 rutas', () => {
    expect(rutas.length).toBe(86);
    expect(rutas.filter((r) => !existsSync(path.join(web, 'public', r)))).toEqual([]);
  });

  it('las pantallas conectadas cargan el modo demo y siguen funcionando sin él', () => {
    for (const p of ['Flujo1_Descubrir', 'FlujoV1_Feed', 'FlujoV4_Calificar']) {
      const html = readFileSync(path.join(web, 'public/kinoo-flujo', `${p}.dc.html`), 'utf8');
      expect(html).toContain('<script src="../_kinoo/kinoo-demo.js"></script>');
      expect(html).toMatch(/window\.KinooDemo/);
    }
  });
});
