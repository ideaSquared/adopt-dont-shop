import { defineServiceConfig } from '../../vitest.shared.config';

export default defineServiceConfig({
  test: {
    coverage: {
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/test-support.ts',
        'src/index.ts',
        'src/bin.ts',
        'src/cli.ts',
        'src/system.ts',
        'src/prompts.ts',
      ],
      thresholds: {
        statements: 96,
        branches: 87,
        functions: 96,
        lines: 96,
      },
    },
  },
});
