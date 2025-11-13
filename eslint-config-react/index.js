module.exports = {
  extends: ['@adopt-dont-shop/eslint-config-base'],
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
    '@adopt-dont-shop/eslint-config-base',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  rules: {
    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react/no-unescaped-entities': 'warn',
    'react-hooks/exhaustive-deps': 'warn',

    // React Refresh (for Vite HMR)
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],

    // Accessibility rules
    'jsx-a11y/no-autofocus': 'warn',
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/mouse-events-have-key-events': 'warn',

    // Override base config for React apps
    'no-console': 'off', // Allow console in frontend for debugging
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/', '*.d.ts'],
};
