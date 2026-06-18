import { defineConfig } from 'vitest/config';

/**
 * ADS-796: Vitest config for the repo-root maintenance scripts in scripts/.
 * These are plain Node ESM utilities (e.g. the coverage ratchet) that live
 * outside the workspace packages, so they need their own node-environment
 * project rather than the jsdom-based shared config. Run with
 * `pnpm test:scripts`.
 */
export default defineConfig({
  test: {
    name: 'scripts',
    environment: 'node',
    include: ['scripts/**/*.test.mjs'],
  },
});
