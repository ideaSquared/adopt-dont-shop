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
      // ADS-1243: thresholds ratcheted to current coverage via
      // scripts/ratchet-coverage.mjs. Coverage is low because the existing
      // tests exercise little of the source (some are near-tautological);
      // replacing them with behaviour tests to raise this floor is a
      // follow-up.
      thresholds: {
        statements: 7,
        branches: 0,
        functions: 19,
        lines: 7,
      },
    },
  },
});
