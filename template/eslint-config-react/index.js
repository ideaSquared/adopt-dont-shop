module.exports = {
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  plugins: ['react', 'react-hooks', 'react-refresh', 'jsx-a11y'],
  extends: [
    '@my-org/eslint-config-base',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react/no-array-index-key': 'warn',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'jsx-a11y/no-autofocus': 'warn',
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/mouse-events-have-key-events': 'warn',
    'react/no-danger': 'error',
    'no-console': 'off',
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/', '*.d.ts'],
};
