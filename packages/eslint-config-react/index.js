import baseConfig from '@adopt-dont-shop/eslint-config-base';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';

// ADS-1244: eslint-plugin-jsx-a11y is re-enabled — 6.10.2 supports eslint 10
// and flat config, so the old "wait for eslint 10" blocker is gone. Its
// recommended rules run at 'warn' (not 'error') so accessibility is enforced
// as an advisory signal first: pre-existing violations surface as warnings
// rather than failing CI. Ratchet individual rules to 'error' as they reach
// zero violations.
const jsxA11yRecommendedAsWarn = Object.fromEntries(
  Object.keys(pluginJsxA11y.flatConfigs.recommended.rules).map(rule => [rule, 'warn'])
);

export default [
  ...baseConfig,
  pluginReact.configs.flat.recommended,
  {
    plugins: {
      'jsx-a11y': pluginJsxA11y,
      'react-hooks': pluginReactHooks,
      'react-refresh': pluginReactRefresh,
    },
    settings: {
      react: {
        // Pinned instead of 'detect': eslint-plugin-react@7.37.5's version
        // auto-detection calls the removed `context.getFilename()` and crashes
        // under eslint 10. TODO: revert to 'detect' once eslint-plugin-react
        // ships an eslint-10-compatible release.
        version: '19.0',
      },
    },
    rules: {
      // ADS-1244: jsx-a11y recommended set, all downgraded to 'warn' (advisory).
      // Spread first so any explicit override below takes precedence.
      ...jsxA11yRecommendedAsWarn,

      // ADS-1326: ratcheted to 'error' — zero violations across the codebase
      // as of this ratchet. See docs/ACCESSIBILITY.md for the baseline and
      // the remaining warn-level rule counts.
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-ambiguous-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-activedescendant-has-tabindex': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/autocomplete-valid': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/iframe-has-title': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/media-has-caption': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-interactive-element-to-noninteractive-role': 'error',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'error',
      'jsx-a11y/no-noninteractive-tabindex': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/scope': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',

      // react-hooks core rules (v7 "recommended" adds many React Compiler
      // rules that this codebase isn't ready for — only enable the classic two)
      'react-hooks/rules-of-hooks': 'error',

      // React specific rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-array-index-key': 'warn',

      // React Refresh (for Vite HMR)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ADS-522: discourage inline styles — prefer Vanilla Extract classes
      'react/forbid-component-props': [
        'warn',
        {
          forbid: [
            {
              propName: 'style',
              message: 'Use a Vanilla Extract class instead of inline style — see ADS-522.',
            },
          ],
        },
      ],

      // Security: disallow unsanitized dangerouslySetInnerHTML
      'react/no-danger': 'error',

      // Override base config for React apps — allow only warn/error
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
];
