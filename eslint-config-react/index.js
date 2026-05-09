import baseConfig from '@adopt-dont-shop/eslint-config-base';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  ...baseConfig,
  pluginReact.configs.flat.recommended,
  pluginJsxA11y.flatConfigs.recommended,
  {
    plugins: {
      'react-hooks': pluginReactHooks,
      'react-refresh': pluginReactRefresh,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,

      // React specific rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-array-index-key': 'warn',

      // React Refresh (for Vite HMR)
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Accessibility rules
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/mouse-events-have-key-events': 'warn',

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
