/**
 * Shared ESLint flat-config for Node.js services (e.g. service.backend).
 *
 * Extends the base TS config and tightens a few rules that don't apply to
 * frontend code (e.g. no-process-exit). `@typescript-eslint/no-explicit-any`
 * stays at the base 'warn' level (ADS-282) — surface new violations without
 * a CI-failing gate.
 */
const baseConfig = require('@adopt-dont-shop/eslint-config-base');
const globals = require('globals');

// Mirror base config's TS-only restriction. The legacy `--ext .ts` lint
// script meant `.js` scripts (`scripts/*.js`, etc.) were never linted; flat
// config has no `--ext`, so we explicitly scope per-rule blocks to TS.
const TS_FILES = ['**/*.{ts,tsx}'];

module.exports = [
  ...baseConfig,
  {
    files: TS_FILES,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      'no-console': 'error',
      'no-process-exit': 'error',
    },
  },
  {
    // Test files - more lenient
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Seeders and development scripts - allow console
    files: ['**/seeders/**/*.{ts,tsx}', '**/console-provider.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
