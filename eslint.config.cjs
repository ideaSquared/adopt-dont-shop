// Root ESLint flat-config (ADS-384). Individual packages have their own
// eslint.config.cjs that imports from @adopt-dont-shop/eslint-config-*.
const baseConfig = require('@adopt-dont-shop/eslint-config-base');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/.next/**',
    ],
  },
  ...baseConfig,
];
