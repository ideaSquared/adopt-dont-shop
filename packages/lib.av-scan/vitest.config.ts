import { defineLibConfig } from '../../vitest.shared.config';

export default defineLibConfig({
  test: {
    // Node-only backend logic (TCP client for clamd) — no DOM involved.
    // Mirrors lib.audit-logs / lib.notifications / lib.validation.
    environment: 'node',
    coverage: {
      // ADS-1004: measured baseline at introduction (ADS-1241).
      // Measured: statements=100 branches=100 functions=100 lines=100
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
