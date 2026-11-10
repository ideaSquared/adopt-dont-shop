import path from 'path';
import { createRequire } from 'module';
import type { StorybookConfig } from '@storybook/react-vite';
import type { Alias, UserConfig } from 'vite';

// lib.components has "type":"module" so this config runs as ESM.
// createRequire(import.meta.url) gives us a require() that resolves
// relative to this file's location, finding @storybook/react-vite in
// lib.components/node_modules/ rather than the hoisted workspace root.
const require = createRequire(import.meta.url);

type AliasOption = NonNullable<NonNullable<UserConfig['resolve']>['alias']>;

// Vite accepts aliases as an array of entries or as a plain record.
const toAliasEntries = (alias: AliasOption | undefined): Alias[] => {
  if (!alias) {
    return [];
  }
  if (Array.isArray(alias)) {
    return alias;
  }
  return Object.entries(alias).map(([find, replacement]) => ({ find, replacement }));
};

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
  // StatusBadge imports @adopt-dont-shop/lib.types, whose package entry is its
  // built dist. Resolve it from source so Storybook builds without a prior
  // `turbo build` of lib.types (the Storybook CI job only installs).
  viteFinal: viteConfig => ({
    ...viteConfig,
    resolve: {
      ...viteConfig.resolve,
      alias: [
        ...toAliasEntries(viteConfig.resolve?.alias),
        {
          find: '@adopt-dont-shop/lib.types',
          replacement: path.resolve(import.meta.dirname, '../../lib.types/src/index.ts'),
        },
      ],
    },
  }),
};

export default config;
