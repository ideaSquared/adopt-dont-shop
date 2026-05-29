import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'src/index.ts'],
      // ADS-717: ratcheted to measured baseline (2026-05-29).
      // Measured (with web-vitals.ts included): statements=62.06 branches=57.69 functions=60 lines=64.81
      thresholds: {
        statements: 61,
        branches: 56,
        functions: 59,
        lines: 63,
      },
    },
  },
});
