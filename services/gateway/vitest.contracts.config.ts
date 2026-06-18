// Vitest configuration for Pact contract tests.
// Separate from the main vitest.config.ts so contract tests do not run
// in the default test:coverage pass (they write / read pact files and need
// to run consumer-first → provider-second, which is the job ordering in CI).
//
// Run consumer tests first, then provider tests, using the same vitest runner:
//   pnpm --filter @adopt-dont-shop/service.gateway test:contracts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/contracts/**/*.test.ts'],
    // Consumer tests must run before provider tests so pact files exist before
    // the verifier tries to read them. Pact's MessageConsumerPact writes the
    // file synchronously after each verify() — no setup / teardown race.
    // Using a single vitest process (not separate runs) also means the pact
    // files created by consumer tests are available to provider tests within
    // the same run.
    sequence: {
      // Consumer suites first (write pact files), provider suites second (read them).
      // File ordering: consumer tests are named *.consumer.test.ts, provider tests *.provider.test.ts.
      // We rely on alphabetical ordering (c < p) which matches this convention.
    },
    testTimeout: 30_000,
    // Prevent interference with the main test suite's pact directory.
    // Each service writes its pacts to services/{name}/pacts/ via the config.
  },
});
