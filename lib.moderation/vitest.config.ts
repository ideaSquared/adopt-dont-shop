import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from '../vitest.shared.config';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'lib.moderation',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    },
  })
);
