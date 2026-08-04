import { defineServiceConfig } from '../../vitest.shared.config';

// Server tests bind real ports and spin up upstream stubs — give them some
// headroom over the 5s default but keep them tight (see shared testTimeout).
export default defineServiceConfig({
  test: {
    coverage: {
      // ratcheted to measured baseline (2026-08-04, ADS-1004): the service
      // owns its own floor the same way lib.* packages ratchet against
      // vitest.shared.config.
      // Measured: statements=83.76 branches=71.5 functions=77.55 lines=83.63
      thresholds: {
        statements: 82,
        branches: 70,
        functions: 76,
        lines: 82,
      },
    },
  },
});
