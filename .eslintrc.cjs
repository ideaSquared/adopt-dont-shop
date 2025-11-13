// Root ESLint configuration
// Individual packages extend from shared configs in eslint-config-*
module.exports = {
  root: true,
  // Minimal default config - packages should extend appropriate shared configs
  extends: ['@adopt-dont-shop/eslint-config-base'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.d.ts',
    '.eslintrc.*',
  ],
};
