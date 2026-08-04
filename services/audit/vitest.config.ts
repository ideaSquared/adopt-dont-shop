import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      // ratcheted to measured baseline (2026-08-04, ADS-1004): the service
      // owns its own floor the same way lib.* packages ratchet against
      // vitest.shared.config.
      // Measured: statements=79.48 branches=80.66 functions=69.56 lines=79.34
      thresholds: {
        statements: 78,
        branches: 79,
        functions: 68,
        lines: 78,
      },
    },
  },
});
