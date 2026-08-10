import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { discoverVitestProjectDirs } from './discover-vitest-projects.mjs';

describe('discoverVitestProjectDirs (ADS-1108)', () => {
  let repoRoot;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'discover-vitest-projects-'));
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('finds a package directory that has a vitest.config.ts', () => {
    mkdirSync(join(repoRoot, 'packages', 'lib.foo'), { recursive: true });
    writeFileSync(join(repoRoot, 'packages', 'lib.foo', 'vitest.config.ts'), '');

    expect(discoverVitestProjectDirs(repoRoot, 'packages')).toEqual(['lib.foo']);
  });

  it('excludes a package directory with no vitest.config.ts', () => {
    mkdirSync(join(repoRoot, 'packages', 'lib.bar'), { recursive: true });

    expect(discoverVitestProjectDirs(repoRoot, 'packages')).toEqual([]);
  });

  it('ignores non-directory entries', () => {
    mkdirSync(join(repoRoot, 'packages'), { recursive: true });
    writeFileSync(join(repoRoot, 'packages', 'README.md'), '');

    expect(discoverVitestProjectDirs(repoRoot, 'packages')).toEqual([]);
  });

  it('applies the optional nameFilter', () => {
    mkdirSync(join(repoRoot, 'apps', 'admin'), { recursive: true });
    mkdirSync(join(repoRoot, 'apps', 'client'), { recursive: true });
    writeFileSync(join(repoRoot, 'apps', 'admin', 'vitest.config.ts'), '');
    writeFileSync(join(repoRoot, 'apps', 'client', 'vitest.config.ts'), '');

    expect(discoverVitestProjectDirs(repoRoot, 'apps', name => name === 'admin')).toEqual([
      'admin',
    ]);
  });

  it('is not affected by comment text elsewhere on disk (no source-text parsing)', () => {
    mkdirSync(join(repoRoot, 'packages', 'lib.foo'), { recursive: true });
    writeFileSync(join(repoRoot, 'packages', 'lib.foo', 'vitest.config.ts'), '');
    writeFileSync(
      join(repoRoot, 'vitest.workspace.ts'),
      "// this used to reference 'packages/lib.*/vitest.config.ts' as a comment only"
    );

    expect(discoverVitestProjectDirs(repoRoot, 'packages')).toEqual(['lib.foo']);
  });
});
