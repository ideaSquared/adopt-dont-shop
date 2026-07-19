import baseConfig from '@adopt-dont-shop/eslint-config-base';

export default [
  ...baseConfig,
  {
    rules: {
      // Stricter rules for backend services. ADS-282 leaves
      // `@typescript-eslint/no-explicit-any` at the base 'warn' level so new
      // `as any` introductions surface in PR checks/IDE without a CI-failing
      // gate; the existing-site sweep stays deferred.
      'no-console': 'error',
      'no-process-exit': 'error',
      'no-process-env': 'off',
    },
  },
  {
    // Test files - more lenient
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}', '**/__tests__/**'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // DB CLI scripts (migration runners, seeders, spam-check backfills) and
    // node-pg-migrate migration files run standalone from a shell — console
    // output is their intended UI, not application logging. (ADS-982: the
    // old `**/seeders/**` / `**/console-provider.ts` globs predate the
    // service split and matched nothing in the current layout.)
    files: ['**/db/migrate.ts', '**/db/seed.ts', '**/db/spam.ts', '**/migrations/**'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Service entrypoints and migration runners legitimately call
    // process.exit() to signal success/failure to the invoking shell or
    // container orchestrator on startup failure / graceful shutdown.
    files: ['**/index.ts', '**/db/migrate.ts'],
    rules: {
      'no-process-exit': 'off',
    },
  },
];
