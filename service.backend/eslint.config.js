import nodeConfig from '@adopt-dont-shop/eslint-config-node';

export default [
  ...nodeConfig,
  {
    // Utility scripts are not app source — relax rules
    files: ['scripts/**'],
    rules: {
      'no-console': 'off',
      'no-process-exit': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
