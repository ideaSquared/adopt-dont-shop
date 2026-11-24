import { describe, it, expect } from 'vitest';

import { parsePnpmWorkspaceMaps } from './pnpm-settings.mjs';

const YAML = `packages:
  - 'apps/*'

allowBuilds:
  'esbuild': true
  sharp: false

overrides:
  # a comment
  '@types/react': '19.2.16'
  'uuid@<11.1.1': '11.1.1'
  'eslint-plugin-react>eslint': '$eslint'
`;

describe('parsePnpmWorkspaceMaps', () => {
  it('reads quoted and bare keys from the overrides and allowBuilds maps', () => {
    const maps = parsePnpmWorkspaceMaps(YAML);
    expect(maps.overrides).toEqual({
      '@types/react': '19.2.16',
      'uuid@<11.1.1': '11.1.1',
      'eslint-plugin-react>eslint': '$eslint',
    });
    expect(maps.allowBuilds).toEqual({ esbuild: 'true', sharp: 'false' });
  });

  it('ignores the packages list', () => {
    expect(parsePnpmWorkspaceMaps(YAML).packages).toEqual({});
  });
});
