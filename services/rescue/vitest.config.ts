import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      // ratcheted to measured baseline (2026-08-04, ADS-1004): the service
      // owns its own floor the same way lib.* packages ratchet against
      // vitest.shared.config.
      // Measured: statements=77.89 branches=76.86 functions=75.33 lines=77.85
      thresholds: {
        statements: 76,
        branches: 75,
        functions: 74,
        lines: 76,
      },
    },
  },
});
