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
    // Seeders and development scripts - allow console
    files: ['**/seeders/**', '**/console-provider.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
