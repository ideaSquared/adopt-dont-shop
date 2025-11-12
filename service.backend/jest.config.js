/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/setup-tests.ts'],
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@/models/(.*)$': '<rootDir>/src/models/$1',
    '^@/routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@/middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/config/(.*)$': '<rootDir>/src/config/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(csrf-csrf)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,js}',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.{ts,js}', '<rootDir>/src/**/*.{test,spec}.{ts,js}'],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
};
