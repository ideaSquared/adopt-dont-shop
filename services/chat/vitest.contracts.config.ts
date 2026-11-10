// Vitest configuration for Pact contract tests (provider verification).
// See services/gateway/vitest.contracts.config.ts for design notes.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/contracts/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
