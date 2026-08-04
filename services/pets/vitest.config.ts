import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      // ratcheted to measured baseline (2026-08-04, ADS-1004): the service
      // owns its own floor the same way lib.* packages ratchet against
      // vitest.shared.config.
      // Measured: statements=73.37 branches=81.76 functions=78.31 lines=73.15
      thresholds: {
        statements: 72,
        branches: 80,
        functions: 77,
        lines: 72,
      },
    },
  },
});
