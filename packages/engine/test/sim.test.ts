import { defaultConfig } from '@kinoo/config';
import { describe, expect, it } from 'vitest';
import { runAll } from '../sim/scenarios';

// Las cinco pruebas de la sección 16 sobre el catálogo sintético de referencia (semilla 42).
describe('simulador de usuarios sintéticos (16)', () => {
  const results = runAll(defaultConfig);
  for (const r of results) {
    it(`${r.name}: ${r.criterion}`, () => {
      expect(r.pass, JSON.stringify(r.metrics)).toBe(true);
    });
  }
});
