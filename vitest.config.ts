import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@kinoo/engine': path.resolve(__dirname, 'packages/engine/src/index.ts'),
      '@kinoo/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@kinoo/api': path.resolve(__dirname, 'packages/api/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'scripts/**/*.test.ts', 'supabase/**/*.test.ts', 'apps/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
