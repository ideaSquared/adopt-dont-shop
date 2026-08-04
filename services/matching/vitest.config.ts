import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      // ratcheted to measured baseline (2026-08-04, ADS-1004): the service
      // owns its own floor the same way lib.* packages ratchet against
      // vitest.shared.config.
      // Measured: statements=90.7 branches=83.53 functions=91.36 lines=90.71
      thresholds: {
        statements: 89,
        branches: 82,
        functions: 90,
        lines: 89,
      },
    },
  },
});
