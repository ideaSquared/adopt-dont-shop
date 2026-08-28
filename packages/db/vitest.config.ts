import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        statements: 90,
        branches: 87,
        functions: 69,
        lines: 89,
      },
    },
  },
});
