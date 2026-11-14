import baseConfig from '@adopt-dont-shop/eslint-config-base';

export default [
  ...baseConfig,
  {
    rules: {
      // Stricter rules for backend services. ADS-282 leaves
      // `@typescript-eslint/no-explicit-any` at the base 'warn' level so new
      // `as any` introductions surface in PR checks/IDE without a CI-failing
      // gate; the existing-site sweep stays deferred.
      // Server code logs through @ideasquared/log. The base config lets console.warn/error
      // through; the no-restricted-properties entries below close that gap.
      'no-console': 'error',
      'no-restricted-properties': [
        'error',
        { object: 'console', property: 'warn', message: 'Log through @ideasquared/log.' },
        { object: 'console', property: 'error', message: 'Log through @ideasquared/log.' },
      ],
      'no-process-exit': 'error',
      'no-process-env': 'off',
    },
  },
  {
    // Test files - more lenient
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}', '**/__tests__/**'],
    rules: {
      'no-console': 'off',
      'no-restricted-properties': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Shipped node-pg-migrate migration files are never edited (they predate the shared logger),
    // so one still calls console. Everything else, DB CLI scripts included, logs through
    // @ideasquared/log.
    files: ['**/migrations/**'],
    rules: {
      'no-console': 'off',
      'no-restricted-properties': 'off',
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
