import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      // ratcheted to measured baseline (2026-08-04, ADS-1004): the service
      // owns its own floor the same way lib.* packages ratchet against
      // vitest.shared.config.
      // Measured: statements=83.46 branches=88.19 functions=84.11 lines=83.05
      thresholds: {
        statements: 82,
        branches: 87,
        functions: 83,
        lines: 82,
      },
    },
  },
});
