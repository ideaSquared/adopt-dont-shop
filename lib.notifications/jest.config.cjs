const base = require('../jest.config.base.cjs');
module.exports = {
  ...base,
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup-tests.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/test-utils/**',
  ],
  moduleNameMapper: {
    '^@adopt-dont-shop/lib\\.api$': '<rootDir>/../lib.api/src/index.ts',
    '^mjml$': '<rootDir>/src/email/__tests__/mjml-mock.ts',
  },
};
