import baseConfig from '@adopt-dont-shop/eslint-config-base';
import reactHooks from 'eslint-plugin-react-hooks';

// Root-level config for editor tooling and standalone `eslint .` runs from
// the repo root — NOT what pre-commit or CI use. Both pre-commit (lint-staged,
// see .lintstagedrc.mjs) and CI lint via `turbo run lint`, which runs each
// touched package's own eslint.config.js (which owns rule severities). This
// file only exists so plugin-namespaced `eslint-disable-next-line` directives
// in `.tsx`/`.jsx` files don't error with "rule not found" when linted from
// the root. Registers `react-hooks` because it's the one such plugin already
// a root devDependency; `jsx-a11y` / `react-refresh` (see
// packages/eslint-config-react) aren't, so wiring those in here is a
// follow-up.
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
