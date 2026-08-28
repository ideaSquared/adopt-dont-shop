import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-1243: index.ts is type definitions + constants (excluded from
      // coverage). The MatchingService client is the only coverable source
      // and is fully covered by matching-service.test.ts; thresholds are
      // ratcheted to current coverage via scripts/ratchet-coverage.mjs.
      thresholds: {
        statements: 99,
        branches: 99,
        functions: 99,
        lines: 99,
      },
    },
  },
});
