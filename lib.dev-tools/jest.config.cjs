const base = require('../jest.config.base.cjs');
module.exports = {
  ...base,
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup-tests.ts'],
  moduleNameMapper: {
    '\\.css\\.ts$': '<rootDir>/src/__mocks__/vanillaExtractMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/test-utils/**',
  ],
};
