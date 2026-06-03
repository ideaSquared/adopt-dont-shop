import baseConfig from '@adopt-dont-shop/eslint-config-base';
import reactHooks from 'eslint-plugin-react-hooks';

// TODO: re-add eslint-plugin-jsx-a11y once it supports eslint 10
// Root config used by the pre-commit hook (lint-staged runs from the
// monorepo root and so picks up THIS file rather than per-app configs).
// Register the plugins that per-app configs use so that plugin-namespaced
// `eslint-disable-next-line` directives in `.tsx` files don't error with
// "rule not found" when staged. CI still runs each package's own config
// (which owns rule severities); this just keeps the namespaces known at
// the root.
export default [
  ...baseConfig,
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '**/*.d.ts',
      // Scaffolding templates contain {{PLACEHOLDER}} tokens that aren't valid
      // TS until rendered; eslint can't parse them.
      'scripts/templates/',
    ],
  },
];
