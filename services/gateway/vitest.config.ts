import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Server tests bind real ports and spin up upstream stubs — give them
    // some headroom over the 5s default but keep them tight.
    testTimeout: 10_000,
  },
});
