import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      // config-secrets is a single src/index.ts module, so index.ts is the
      // coverable source here (not an excluded barrel).
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts'],
      thresholds: {
        statements: 99,
        branches: 96,
        functions: 99,
        lines: 99,
      },
    },
  },
});
