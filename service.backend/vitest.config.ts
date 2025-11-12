import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-min-32-characters-long',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-min-32-characters-long',
      SESSION_SECRET: 'test-session-secret-min-32-characters-long',
      CSRF_SECRET: 'test-csrf-secret-min-32-characters-long',
      TEST_DB_NAME: 'test_db',
    },

    // Setup files
    setupFiles: ['./src/setup-tests.ts'],

    // Global test timeout
    testTimeout: 30000,

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,js}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.{ts,js}', 'src/**/*.spec.{ts,js}', 'src/index.ts'],
    },

    // Test file patterns
    include: ['src/**/__tests__/**/*.{ts,js}', 'src/**/*.{test,spec}.{ts,js}'],

    // Exclude helper files
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__tests__/helpers/**',
      '**/__tests__/fixtures/**',
    ],

    // Globals (enable Jest-compatible globals like describe, it, expect)
    globals: true,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/controllers': path.resolve(__dirname, './src/controllers'),
      '@/models': path.resolve(__dirname, './src/models'),
      '@/routes': path.resolve(__dirname, './src/routes'),
      '@/middleware': path.resolve(__dirname, './src/middleware'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
});
