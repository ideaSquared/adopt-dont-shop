import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    name: 'test-utils',
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        statements: 73,
        branches: 91,
        functions: 53,
        lines: 72,
      },
    },
  },
});
