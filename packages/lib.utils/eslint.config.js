import baseConfig from '@adopt-dont-shop/eslint-config-base';

export default [
  ...baseConfig,
  {
    rules: {
      // Allow hasOwnProperty in utility functions
      'no-prototype-builtins': 'off',
      // Allow escape characters in regex patterns
      'no-useless-escape': 'off',
    },
  },
];
