import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
      // Register jsx-a11y at the base level so `eslint-disable-next-line
      // jsx-a11y/...` directives in `.tsx` files are recognised when the
      // root lint-staged hook runs on staged files. Per-app configs still
      // override this with their own jsx-a11y rule severities; this just
      // makes the plugin's namespace known to the base config.
      'jsx-a11y': jsxA11y,
    },
    rules: {
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
      curly: ['warn', 'all'],
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    // Test files and mock helpers - more lenient
    files: [
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
      '**/__tests__/**',
      '**/__mocks__/**',
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      curly: 'off',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'coverage/', '**/*.d.ts'],
  }
);
