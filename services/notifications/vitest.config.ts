import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      // ratcheted to measured baseline (2026-08-04, ADS-1004): the service
      // owns its own floor the same way lib.* packages ratchet against
      // vitest.shared.config.
      // Measured: statements=79.62 branches=74.5 functions=81.52 lines=79.64
      thresholds: {
        statements: 78,
        branches: 73,
        functions: 80,
        lines: 78,
      },
    },
  },
});
