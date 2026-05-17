module.exports = {
  extends: ['@my-org/eslint-config-base'],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': 'error',
    'no-process-exit': 'error',
    'no-process-env': 'off',
  },
  overrides: [
    {
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
      files: ['**/seeders/**', '**/console-provider.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/', '*.d.ts'],
};
