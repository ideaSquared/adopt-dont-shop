/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setup-tests.tsx'],
  globals: {
    'import.meta': {
      env: {
        VITE_API_BASE_URL: 'http://localhost:5000',
        NODE_ENV: 'test',
        DEV: false,
      },
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
    // Mock library dependencies
    '^@adopt-dont-shop/lib-auth$': '<rootDir>/src/__mocks__/lib-auth.ts',
    '^@adopt-dont-shop/lib-pets$': '<rootDir>/src/__mocks__/lib-pets.ts',
    '^@adopt-dont-shop/lib-applications$': '<rootDir>/src/__mocks__/lib-applications.ts',
    '^@adopt-dont-shop/lib-rescue$': '<rootDir>/src/__mocks__/lib-rescue.ts',
    '^@adopt-dont-shop/lib-api$': '<rootDir>/src/__mocks__/lib-common.ts',
    '^@adopt-dont-shop/lib-chat$': '<rootDir>/src/__mocks__/lib-common.ts',
    '^@adopt-dont-shop/lib-analytics$': '<rootDir>/src/__mocks__/lib-common.ts',
    '^@adopt-dont-shop/lib-notifications$': '<rootDir>/src/__mocks__/lib-common.ts',
    '^@adopt-dont-shop/lib-feature-flags$': '<rootDir>/src/__mocks__/lib-common.ts',
    '^@adopt-dont-shop/lib-permissions$': '<rootDir>/src/__mocks__/lib-common.ts',
    '^@adopt-dont-shop/lib-search$': '<rootDir>/src/__mocks__/lib-common.ts',
    '^@adopt-dont-shop/lib-discovery$': '<rootDir>/src/__mocks__/lib-common.ts',
    '^@adopt-dont-shop/lib-validation$': '<rootDir>/src/__mocks__/lib-common.ts',
    '^@adopt-dont-shop/lib-utils$': '<rootDir>/src/__mocks__/lib-common.ts',
    '^@adopt-dont-shop/components$': '<rootDir>/src/__mocks__/components.tsx',
    '\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\.(gif|ttf|eot|svg|png)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000,
};
