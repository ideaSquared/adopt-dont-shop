import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'test-utils',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 10_000,
  },
});
