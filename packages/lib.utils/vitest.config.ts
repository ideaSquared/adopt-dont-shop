import { defineLibConfig } from '../../vitest.shared.config';

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
      // ADS-717: ratcheted to measured baseline (2026-06-16).
      // Measured: statements=88.66 branches=80.76 functions=98.41 lines=88.43
      thresholds: {
        statements: 87,
        branches: 79,
        functions: 97,
        lines: 87,
      },
    },
  },
});
