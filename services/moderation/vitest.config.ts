import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      // ratcheted to measured baseline (2026-08-04, ADS-1004): the service
      // owns its own floor the same way lib.* packages ratchet against
      // vitest.shared.config.
      // Measured: statements=80.84 branches=91.49 functions=80.16 lines=80.78
      thresholds: {
        statements: 79,
        branches: 90,
        functions: 79,
        lines: 79,
      },
    },
  },
});
