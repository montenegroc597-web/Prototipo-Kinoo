import { defineWorkspace } from 'vitest/config';
import { alias } from './vitest.config';

// Dos grupos de pruebas:
//  - unit: lógica pura (motor, núcleo, catálogo, configuración, front). Rápidas, sin base de datos.
//  - integration: base de datos real (PostgreSQL en memoria con PGlite) y la API HTTP de punta a punta.
// Las e2e (navegador) viven en apps/web/e2e y corren con Playwright.
export default defineWorkspace([
  {
    resolve: { alias },
    test: {
      name: 'unit',
      include: ['packages/{shared,config,engine,core,catalog}/test/**/*.test.ts', 'apps/web/test/**/*.test.ts'],
      testTimeout: 60_000,
    },
  },
  {
    resolve: { alias },
    test: {
      name: 'integration',
      include: ['packages/db/test/**/*.test.ts', 'apps/api/test/**/*.test.ts'],
      testTimeout: 60_000,
    },
  },
]);
