/**
 * Shared ESLint flat-config base for TypeScript packages.
 *
 * ADS-384: migrated from legacy .eslintrc to ESLint v9 flat config.
 * ADS-282: `@typescript-eslint/no-explicit-any` is a warning — surfaces
 *          new `as any` violations without forcing an existing-site sweep.
 *          `no-unsafe-assignment` requires typed linting (parserOptions.project)
 *          so it's omitted here; revisit once the repo opts into typed linting.
 */
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const js = require('@eslint/js');
const globals = require('globals');

const baseRules = {
  // Prettier integration
  'prettier/prettier': 'error',

  // TypeScript specific rules
  '@typescript-eslint/no-unused-vars': [
    'warn',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-empty-object-type': 'off',

  // General JavaScript/TypeScript rules
  'no-console': [
    'warn',
    {
      allow: ['warn', 'error', 'info'],
    },
  ],
  'no-debugger': 'warn',
  'prefer-const': 'error',
  'no-var': 'error',
  eqeqeq: ['error', 'always'],
  curly: ['error', 'all'],
  'no-duplicate-imports': 'error',
  'no-unused-expressions': 'error',
  'no-eval': 'error',
  'no-new-func': 'error',

  // Rules promoted to errors in ESLint v9's `eslint:recommended` that the
  // legacy v8 preset didn't enforce. Keep them off to match legacy lint
  // outcomes — revisit case-by-case in a follow-up cleanup PR.
  'no-prototype-builtins': 'off',
  'no-useless-escape': 'off',
  'no-empty': 'off',
  'no-empty-pattern': 'off',
  'no-case-declarations': 'off',
  'no-async-promise-executor': 'off',
  'no-misleading-character-class': 'off',
  'no-control-regex': 'off',
  'no-irregular-whitespace': 'off',
  'no-fallthrough': 'off',
  'no-constant-binary-expression': 'off',
  'no-constant-condition': 'off',
  '@typescript-eslint/no-require-imports': 'off',
  '@typescript-eslint/no-unused-expressions': 'off',
  '@typescript-eslint/no-wrapper-object-types': 'off',
  '@typescript-eslint/no-unsafe-function-type': 'off',
  '@typescript-eslint/no-unsafe-declaration-merging': 'off',
};

// The legacy config only ran with `--ext ts[,tsx]`. Mirror that here by
// restricting the typed rule blocks to `.ts`/`.tsx` files; .js mocks,
// vite configs, etc. continue to skip lint.
const TS_FILES = ['**/*.{ts,tsx}'];

const baseConfig = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/.next/**',
    ],
  },
  {
    files: TS_FILES,
    ...js.configs.recommended,
  },
  ...tsPlugin.configs['flat/recommended'].map(c => ({ ...c, files: TS_FILES })),
  { files: TS_FILES, ...prettierConfig },
  {
    files: TS_FILES,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
        ...globals.jest,
      },
    },
    // react-hooks is registered (but not enabled) so that legacy
    // `eslint-disable react-hooks/X` directives in non-React libs don't
    // break the build under ESLint v9's stricter rule-name resolution.
    plugins: {
      prettier: prettierPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: baseRules,
  },
  {
    // Test files - more lenient
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

module.exports = baseConfig;
module.exports.baseRules = baseRules;
