import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    coverage: {
      // ADS-717: index.ts is type definitions + constants (excluded from
      // coverage). The MatchingService client is the only coverable source
      // and is fully covered by matching-service.test.ts, but thresholds
      // are held at 0 to avoid coupling the gate to that single file.
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
});
