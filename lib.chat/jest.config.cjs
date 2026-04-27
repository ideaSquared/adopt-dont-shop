const base = require('../../jest.config.base.cjs');
module.exports = {
  ...base,
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@adopt-dont-shop/lib\\.components$': '<rootDir>/src/__mocks__/lib.components.tsx',
    '^react-icons/md$': '<rootDir>/src/__mocks__/react-icons.tsx',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/setupTests.ts',
    '!src/test-utils.tsx',
    '!src/__mocks__/**/*',
    '!src/index.ts',
  ],
};
