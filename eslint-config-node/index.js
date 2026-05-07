import baseConfig from '@adopt-dont-shop/eslint-config-base';

export default [
  ...baseConfig,
  {
    rules: {
      // Stricter rules for backend services
      '@typescript-eslint/no-explicit-any': 'error',
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
