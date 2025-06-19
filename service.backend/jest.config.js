/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
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
    '^.+\\.(ts)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.{ts}', '!src/**/*.d.ts', '!src/index.ts', '!src/setupTests.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.{ts}', '<rootDir>/src/**/*.{test,spec}.{ts}'],
  clearMocks: true,
  restoreMocks: true,
};
