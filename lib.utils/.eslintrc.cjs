// Library ESLint configuration
// Extends the shared base TypeScript config
module.exports = {
  extends: ['@adopt-dont-shop/eslint-config-base'],
  rules: {
    // Allow hasOwnProperty in utility functions
    'no-prototype-builtins': 'off',
    // Allow escape characters in regex patterns
    'no-useless-escape': 'off',
  },
};
