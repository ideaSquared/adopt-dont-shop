import path from 'path';
import type { StorybookConfig } from '@storybook/react-vite';

// In an npm workspace monorepo the storybook binary lives at the root while
// @storybook/react-vite is installed under lib.components/node_modules.
// Resolving the package directory from this config file's location ensures
// storybook can find the preset regardless of hoisting.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
