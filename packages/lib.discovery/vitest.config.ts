import { defineLibConfig } from '../vitest.shared.config';

export default defineLibConfig({
  test: {
    setupFiles: ['./src/test-utils/setup-tests.ts'],
    coverage: {
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/test-utils/**',
        'src/index.ts',
      ],
      // ADS-717: ratcheted to measured baseline (2026-05-29).
      // Measured: statements=89.74 branches=71.69 functions=85.71 lines=92.1
      thresholds: {
        statements: 88,
        branches: 70,
        functions: 84,
        lines: 91,
      },
    },
  },
});
