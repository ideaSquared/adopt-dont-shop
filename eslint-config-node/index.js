module.exports = {
  extends: ['@adopt-dont-shop/eslint-config-base'],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // Stricter rules for backend services
    '@typescript-eslint/no-explicit-any': 'error', // Stricter than base
    'no-console': 'error', // No console.log in production backend code
    'no-process-exit': 'error',
    'no-process-env': 'off', // Allow process.env for configuration
  },
  overrides: [
    {
      // Test files - more lenient
      files: [
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        '**/__tests__/**',
      ],
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
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/', '*.d.ts'],
};
