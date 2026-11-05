import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Alias de los paquetes del monorepo (los mismos que tsconfig.json).
export const alias = {
  '@kinoo/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
  '@kinoo/config': path.resolve(__dirname, 'packages/config/src/index.ts'),
  '@kinoo/engine': path.resolve(__dirname, 'packages/engine/src/index.ts'),
  '@kinoo/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
  '@kinoo/db/files': path.resolve(__dirname, 'packages/db/src/files.ts'),
  '@kinoo/db': path.resolve(__dirname, 'packages/db/src/index.ts'),
  '@kinoo/catalog': path.resolve(__dirname, 'packages/catalog/src/index.ts'),
  '@kinoo/api': path.resolve(__dirname, 'apps/api/src/index.ts'),
};

export default defineConfig({
  resolve: { alias },
  test: {
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**', 'apps/api/src/**'],
      exclude: ['**/*.test.ts', 'apps/api/src/server.node.ts', 'apps/api/src/edge.supabase.ts'],
      reporter: ['text-summary', 'html'],
    },
  },
});
