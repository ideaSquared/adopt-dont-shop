module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended', // Integrates Prettier for code formatting
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['import', 'react-refresh', 'jsx-a11y', 'prettier'],
  settings: {
    react: {
      version: 'detect', // Automatically detects the React version
    },
  },
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/prop-types': 'off', // Since you're using TypeScript for type checking
    'jsx-a11y/no-autofocus': 'warn', // Accessibility rule, adjust as needed
    '@typescript-eslint/no-unused-vars': 'warn',
    'default-case': 'error',
    'no-console': ['warn', { allow: ['warn', 'info'] }],
    'no-debugger': 'warn',
    'import/no-absolute-path': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
  },
}
