import path from 'path';
import { createRequire } from 'module';
import type { StorybookConfig } from '@storybook/react-vite';

// lib.components has "type":"module" so this config runs as ESM.
// createRequire(import.meta.url) gives us a require() that resolves
// relative to this file's location, finding @storybook/react-vite in
// lib.components/node_modules/ rather than the hoisted workspace root.
const require = createRequire(import.meta.url);

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: path.dirname(
      require.resolve('@storybook/react-vite/package.json')
    ) as '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
