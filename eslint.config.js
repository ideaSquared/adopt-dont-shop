import baseConfig from '@adopt-dont-shop/eslint-config-base';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';

// Root config used by the pre-commit hook (lint-staged runs from the
// monorepo root and so picks up THIS file rather than per-app configs).
// Register the plugins that per-app configs use so that
// `eslint-disable-next-line jsx-a11y/...` directives in `.tsx` files
// don't error with "rule not found" when staged. CI still runs each
// package's own config (which owns rule severities); this just keeps
// the namespaces known at the root.
export default [
  ...baseConfig,
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'coverage/', '**/*.d.ts'],
  },
];
