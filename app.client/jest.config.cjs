/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '../',
  setupFiles: ['<rootDir>/app.client/src/test-utils/polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/app.client/src/setup-tests.ts'],
  moduleNameMapper: {
    // Mock workspace packages to avoid import.meta issues
    '^@adopt-dont-shop/lib-auth$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-auth.tsx',
    '^@adopt-dont-shop/lib-api$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-api.ts',
    '^@adopt-dont-shop/lib-analytics$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-analytics.ts',
    '^@adopt-dont-shop/lib-notifications$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-notifications.ts',
    '^@adopt-dont-shop/lib-applications$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-applications.ts',
    '^@adopt-dont-shop/lib-pets$': '<rootDir>/app.client/src/__mocks__/@adopt-dont-shop/lib-pets.ts',
    // Map workspace packages to their source directories
    '^@adopt-dont-shop/lib-(.*)$': '<rootDir>/lib.$1/src',
    '^@adopt-dont-shop/components$': '<rootDir>/lib.components/src',
    // Mock specific contexts and hooks before general @/ pattern
    '^@/contexts/NotificationsContext$': '<rootDir>/app.client/src/__mocks__/contexts/NotificationsContext.tsx',
    '^@/hooks/useStatsig$': '<rootDir>/app.client/src/__mocks__/hooks/useStatsig.ts',
    '^@/(.*)$': '<rootDir>/app.client/src/$1',
    '^@/components/(.*)$': '<rootDir>/app.client/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/app.client/src/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/app.client/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/app.client/src/types/$1',
    '^@/services/(.*)$': '<rootDir>/app.client/src/services/$1',
    // Map MSW subpath exports for Jest
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
    '^msw$': '<rootDir>/node_modules/msw/lib/core/index.js',
    // Map @mswjs/interceptors subpath exports - specific mappings
    '^@mswjs/interceptors/ClientRequest$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/ClientRequest/index.js',
    '^@mswjs/interceptors/WebSocket$': '<rootDir>/node_modules/@mswjs/interceptors/lib/browser/interceptors/WebSocket/index.js',
    '^@mswjs/interceptors/XMLHttpRequest$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/XMLHttpRequest/index.js',
    '^@mswjs/interceptors/fetch$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/fetch/index.js',
    '^@mswjs/interceptors$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/index.js',
  },
  transform: {
    // Transform all TS/TSX files including workspace packages
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
          baseUrl: 'app.client/src',
          paths: {
            '@/*': ['*'],
            '@/components/*': ['components/*'],
            '@/hooks/*': ['hooks/*'],
            '@/utils/*': ['utils/*'],
            '@/types/*': ['types/*'],
            '@/services/*': ['services/*'],
          },
        },
        babelConfig: true,
        isolatedModules: true,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'app.client/src/**/*.{ts,tsx}',
    '!app.client/src/**/*.d.ts',
    '!app.client/src/main.tsx',
    '!app.client/src/vite-env.d.ts',
  ],
  coverageDirectory: 'app.client/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '<rootDir>/app.client/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/app.client/src/**/*.{test,spec}.{ts,tsx}',
  ],
  clearMocks: true,
  restoreMocks: true,
  // Transform MSW from node_modules, ignore everything else in node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(msw|@bundled-es-modules|@mswjs)/)',
  ],
  // Mock import.meta for Vite environment
  globals: {
    'import.meta': {
      env: {
        VITE_API_BASE_URL: 'http://localhost:5000',
        NODE_ENV: 'test',
        MODE: 'test',
      },
    },
  },
};
