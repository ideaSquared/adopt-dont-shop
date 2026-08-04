import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      // ratcheted to measured baseline (2026-08-04, ADS-1004): the service
      // owns its own floor the same way lib.* packages ratchet against
      // vitest.shared.config.
      // Measured: statements=90.15 branches=83.04 functions=89.69 lines=90.03
      thresholds: {
        statements: 89,
        branches: 82,
        functions: 88,
        lines: 89,
      },
    },
  },
});
