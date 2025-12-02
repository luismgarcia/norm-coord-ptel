import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: true,
    // Setup file que mockea fetch y localStorage
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    // Timeout más corto porque usamos mocks (no hay espera de red)
    testTimeout: 10000,
    // Hooks timeout también reducido
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
