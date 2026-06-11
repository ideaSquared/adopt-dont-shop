import baseConfig from '@adopt-dont-shop/eslint-config-base';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';

// TODO: re-add eslint-plugin-jsx-a11y once it supports eslint 10
export default [
  ...baseConfig,
  pluginReact.configs.flat.recommended,
  {
    plugins: {
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
