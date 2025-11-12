module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/', '*.d.ts', '.eslintrc.*'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error', // Prevent any types - use unknown or proper types
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',

    // General rules
    'no-console': 'error', // Prevent all console usage - use logger instead
    'no-debugger': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',

    // Code quality rules
    eqeqeq: ['warn', 'always'],
    curly: ['warn', 'all'],
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'error',

    // Node.js specific rules
    'no-process-exit': 'error',
    'no-process-env': 'off', // Allow process.env usage

    // Prettier integration
    'prettier/prettier': 'error',
  },
  overrides: [
    // Test files configuration
    {
      files: ['**/*.test.{ts,js}', '**/*.spec.{ts,js}', '**/__tests__/**/*'],
      env: {
        node: true,
      },
      rules: {
        // Test-specific rules
        'no-console': 'off',
      },
    },
    // Seeders and development scripts can use console
    {
      files: ['src/seeders/**/*.ts', 'src/services/email-providers/console-provider.ts'],
      rules: {
        'no-console': 'off', // Console is intentional for CLI feedback in seeders
      },
    },
  ],
};
