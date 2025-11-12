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
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.d.ts',
    '.eslintrc.*',
    'backend/**/*',
    'frontend/**/*',
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',

    // General rules
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-debugger': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',

    // Code quality rules
    eqeqeq: ['warn', 'always'],
    curly: ['warn', 'all'],
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'error',

    // Prettier integration
    'prettier/prettier': 'error',
  },
  overrides: [
    // React-specific configuration for frontend packages
    {
      files: ['app.client/**/*', 'app.admin/**/*', 'app.rescue/**/*', 'lib.components/**/*'],
      env: {
        browser: true,
        es2022: true,
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'prettier',
      ],
      plugins: ['react', 'react-hooks', 'jsx-a11y', '@typescript-eslint', 'prettier'],
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        // React specific rules
        'react/react-in-jsx-scope': 'off', // Not needed with React 17+
        'react/prop-types': 'off', // Using TypeScript for type checking
        'react-hooks/exhaustive-deps': 'warn',
        'react/jsx-uses-react': 'off',
        'react/jsx-uses-vars': 'error',
        'react/no-unescaped-entities': 'warn',

        // TypeScript rules (downgrade to warnings for React apps)
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',

        // Code quality (downgrade to warnings)
        'no-duplicate-imports': 'warn',

        // JSX accessibility
        'jsx-a11y/no-autofocus': 'warn',
        'jsx-a11y/anchor-is-valid': 'warn',
        'jsx-a11y/mouse-events-have-key-events': 'warn',
      },
    },
    // Node.js/Express specific configuration for backend packages
    {
      files: ['service.backend/**/*'],
      env: {
        node: true,
        es2022: true,
      },
      rules: {
        // Node.js specific rules
        'no-process-exit': 'error',
        'no-process-env': 'off', // Allow process.env usage
      },
    },
    // Test files configuration
    {
      files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}', '**/__tests__/**/*'],
      env: {
        node: true,
      },
      rules: {
        // Test-specific rules
        'no-console': 'off',
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
};
