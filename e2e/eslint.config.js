import baseConfig from '@adopt-dont-shop/eslint-config-base';

// TODO: re-add eslint-plugin-playwright once it supports eslint 10 (mirrors
// the eslint-plugin-jsx-a11y TODO in the root eslint.config.js).
export default [
  ...baseConfig,
  {
    ignores: [
      'node_modules/',
      'test-results/',
      'playwright-report/',
      'blob-report/',
      '.auth/',
      'playwright/.cache/',
      '**/*.d.ts',
    ],
  },
];
