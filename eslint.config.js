import baseConfig from '@adopt-dont-shop/eslint-config-base';

export default [
  ...baseConfig,
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'coverage/', '**/*.d.ts'],
  },
];
