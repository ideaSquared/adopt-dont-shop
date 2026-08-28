import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        statements: 82,
        branches: 73,
        functions: 80,
        lines: 82,
      },
    },
  },
});
