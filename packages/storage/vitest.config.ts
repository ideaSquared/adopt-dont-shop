import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/index.ts'],
      thresholds: {
        statements: 72,
        branches: 68,
        functions: 91,
        lines: 72,
      },
    },
  },
});
