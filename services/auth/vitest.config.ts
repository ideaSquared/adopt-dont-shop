import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      // ADS-1315: the RBAC integration suite (handlers.integration.test.ts)
      // now genuinely executes every migration's `up()` via node-pg-migrate
      // when DATABASE_URL is set, which pulls all 33 migration files into
      // v8's instrumented-file set for the first time (previously
      // migrations.test.ts's non-statically-analysable dynamic import never
      // got bundled/instrumented by Vite). Migration files are one-shot DDL
      // — `down()` is never invoked by any test, and per-migration branch
      // coverage isn't a meaningful signal — so exclude them from the floor,
      // matching the existing services/chat and services/cms precedent.
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts', 'src/migrations/**', 'src/**/index.ts'],
      // ratcheted to measured baseline (2026-08-04, ADS-1004): the service
      // owns its own floor the same way lib.* packages ratchet against
      // vitest.shared.config.
      // Measured: statements=90.15 branches=83.04 functions=89.69 lines=90.03
      thresholds: {
        statements: 89,
        branches: 82,
        functions: 88,
        lines: 89,
      },
    },
  },
});
