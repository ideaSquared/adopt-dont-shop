module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(test|spec).(ts|tsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx)',
  ],
  moduleNameMapper: {
    // lib.components ships as a Vite-bundled ESM .js and can't be
    // processed by ts-jest. Chat component tests only need a Button /
    // Spinner / TextArea placeholder — render plain tags instead.
    '^@adopt-dont-shop/lib\\.components$': '<rootDir>/src/__mocks__/lib.components.tsx',
    // Optional deps with heavy/ESM setups the chat components merely
    // re-export through; stub them at module boundary.
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
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
};
