import { describe, expect, it } from 'vitest';

import {
  checkTemplateDepDrift,
  checkToolVersionsDrift,
  computeExpectedDevVolumeMounts,
  extractCiFilterGroups,
  filterMatches,
  findUncoveredPackages,
  parseDevVolumesAnchor,
  rootAuthoritativeRange,
} from './check-workspace-consistency.mjs';

describe('parseDevVolumesAnchor (ADS-987)', () => {
  it('extracts every mount target listed under the x-dev-volumes anchor', () => {
    const compose = [
      'x-dev-build: &dev-build',
      '  image: foo:latest',
      '',
      'x-dev-volumes: &dev-volumes',
      '  - .:/app',
      '  - /app/node_modules',
      '  - /app/apps/admin/node_modules',
      '  - /app/packages/lib.api/node_modules',
      '',
      'services:',
      '  app-admin:',
      '    volumes: *dev-volumes',
    ].join('\n');

    expect(parseDevVolumesAnchor(compose)).toEqual([
      '.:/app',
      '/app/node_modules',
      '/app/apps/admin/node_modules',
      '/app/packages/lib.api/node_modules',
    ]);
  });

  it('returns null when the anchor is missing', () => {
    expect(parseDevVolumesAnchor('services:\n  app-admin:\n    image: foo\n')).toBeNull();
  });
});

describe('computeExpectedDevVolumeMounts (ADS-987)', () => {
  it('builds one node_modules mount per app, e2e, package, and service, plus the root', () => {
    const mounts = computeExpectedDevVolumeMounts(
      ['app.admin', 'app.client'],
      ['lib.api', 'db'],
      ['gateway', 'auth']
    );

    expect(mounts).toEqual([
      '/app/node_modules',
      '/app/apps/admin/node_modules',
      '/app/apps/client/node_modules',
      '/app/e2e/node_modules',
      '/app/packages/lib.api/node_modules',
      '/app/packages/db/node_modules',
      '/app/services/gateway/node_modules',
      '/app/services/auth/node_modules',
    ]);
  });
});

describe('rootAuthoritativeRange (ADS-980)', () => {
  it('prefers a pnpm.overrides entry over dependencies/devDependencies', () => {
    const rootPkg = {
      dependencies: { react: '^19.2.7' },
      pnpm: { overrides: { react: '19.2.7' } },
    };
    expect(rootAuthoritativeRange(rootPkg, 'react')).toBe('19.2.7');
  });

  it('falls back to dependencies, then devDependencies, when there is no override', () => {
    const rootPkg = { dependencies: { react: '^19.2.7' }, devDependencies: { typescript: '^6.0.3' } };
    expect(rootAuthoritativeRange(rootPkg, 'react')).toBe('^19.2.7');
    expect(rootAuthoritativeRange(rootPkg, 'typescript')).toBe('^6.0.3');
  });

  it('returns null when the root does not pin the dependency at all', () => {
    expect(rootAuthoritativeRange({}, 'left-pad')).toBeNull();
  });
});

describe('checkTemplateDepDrift (ADS-980)', () => {
  const rootPkg = {
    devDependencies: { typescript: '^6.0.3', eslint: '^10.5.0' },
    pnpm: { overrides: { react: '19.2.7' } },
  };

  it('reports no drift when a template dependency range overlaps the root', () => {
    const templatePkg = { devDependencies: { typescript: '^6.0.3' } };
    expect(checkTemplateDepDrift('scripts/templates/lib/service/package.json', templatePkg, rootPkg)).toEqual([]);
  });

  it('flags a template dependency whose range cannot resolve to the root pin', () => {
    const templatePkg = { devDependencies: { typescript: '^5.0.2' } };
    const failures = checkTemplateDepDrift('scripts/templates/app/standard/package.json', templatePkg, rootPkg);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("'typescript': '^5.0.2' does not overlap the workspace root's '^6.0.3'");
  });

  it('checks a dependency declared under an override, not just dependencies/devDependencies', () => {
    const templatePkg = { dependencies: { react: '^18.3.1' } };
    const failures = checkTemplateDepDrift('scripts/templates/app/minimal/package.json', templatePkg, rootPkg);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("'react': '^18.3.1' does not overlap the workspace root's '19.2.7'");
  });

  it('ignores dependencies the root does not track at all', () => {
    const templatePkg = { dependencies: { 'left-pad': '^1.0.0' } };
    expect(checkTemplateDepDrift('scripts/templates/lib/utility/package.json', templatePkg, rootPkg)).toEqual([]);
  });
});

describe('checkToolVersionsDrift (ADS-943)', () => {
  it('passes when nodejs major and pnpm version match .nvmrc / packageManager', () => {
    const failures = checkToolVersionsDrift('22.15.1\n', 'pnpm@10.34.3', 'nodejs 22.15.1\npnpm 10.34.3\n');
    expect(failures).toEqual([]);
  });

  it('flags a nodejs major mismatch against .nvmrc', () => {
    const failures = checkToolVersionsDrift('22.15.1\n', 'pnpm@10.34.3', 'nodejs 20.11.0\npnpm 10.34.3\n');
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('nodejs');
  });

  it('flags a pnpm version mismatch against package.json packageManager', () => {
    const failures = checkToolVersionsDrift('22.15.1\n', 'pnpm@10.34.3', 'nodejs 22.15.1\npnpm 9.0.0\n');
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('pnpm');
  });

  it('flags a missing nodejs or pnpm line', () => {
    const failures = checkToolVersionsDrift('22.15.1\n', 'pnpm@10.34.3', 'pnpm 10.34.3\n');
    expect(failures).toEqual(["[.tool-versions] missing a 'nodejs <version>' line (ADS-943)."]);
  });
});

describe('CI test-filter reachability (ADS-1029)', () => {
  const ci = [
    '      - uses: ./.github/actions/run-package-tests',
    '        with:',
    "          filter: '@adopt-dont-shop/app.${{ matrix.app }}'",
    '    strategy:',
    '      matrix:',
    '        app: [client, admin, rescue]',
    '      - uses: ./.github/actions/run-package-tests',
    '        with:',
    "          filter: '@adopt-dont-shop/lib.*'",
    '      - uses: ./.github/actions/run-package-tests',
    '        with:',
    "          filter: './packages/*'",
    "          additional-filter: '!@adopt-dont-shop/lib.*'",
    '      - uses: ./.github/actions/run-package-tests',
    '        with:',
    "          filter: '@adopt-dont-shop/service.*'",
  ].join('\n');

  describe('filterMatches', () => {
    it('matches a name glob against the package name', () => {
      expect(filterMatches('@adopt-dont-shop/lib.*', { name: '@adopt-dont-shop/lib.api', dir: 'packages/lib.api' })).toBe(true);
      expect(filterMatches('@adopt-dont-shop/lib.*', { name: '@adopt-dont-shop/authz', dir: 'packages/authz' })).toBe(false);
    });

    it('matches a brace-list against the package name', () => {
      const f = '@adopt-dont-shop/app.{client,admin,rescue}';
      expect(filterMatches(f, { name: '@adopt-dont-shop/app.admin', dir: 'apps/admin' })).toBe(true);
      expect(filterMatches(f, { name: '@adopt-dont-shop/app.marketing', dir: 'apps/marketing' })).toBe(false);
    });

    it('matches a path selector against the package directory', () => {
      expect(filterMatches('./packages/*', { name: '@adopt-dont-shop/authz', dir: 'packages/authz' })).toBe(true);
      expect(filterMatches('./packages/*', { name: '@adopt-dont-shop/service.auth', dir: 'services/auth' })).toBe(false);
    });
  });

  describe('extractCiFilterGroups', () => {
    it('groups each job filter and expands the frontend matrix', () => {
      const groups = extractCiFilterGroups(ci);
      expect(groups).toContainEqual({
        includes: ['@adopt-dont-shop/app.client', '@adopt-dont-shop/app.admin', '@adopt-dont-shop/app.rescue'],
        excludes: [],
      });
      expect(groups).toContainEqual({ includes: ['./packages/*'], excludes: ['@adopt-dont-shop/lib.*'] });
    });
  });

  describe('findUncoveredPackages', () => {
    const groups = extractCiFilterGroups(ci);

    it('treats lib, non-lib, app and service packages as covered', () => {
      const pkgs = [
        { name: '@adopt-dont-shop/lib.api', dir: 'packages/lib.api' },
        { name: '@adopt-dont-shop/authz', dir: 'packages/authz' },
        { name: '@adopt-dont-shop/app.admin', dir: 'apps/admin' },
        { name: '@adopt-dont-shop/service.auth', dir: 'services/auth' },
      ];
      expect(findUncoveredPackages(pkgs, groups)).toEqual([]);
    });

    it('does not let ./packages/* re-cover a lib excluded by !lib.*', () => {
      // lib.api is covered by the lib.* group, but must NOT be covered by the
      // packages group (whose exclude removes it) — verified by the group shape.
      const packagesGroup = groups.find(g => g.includes.includes('./packages/*'));
      expect(findUncoveredPackages([{ name: '@adopt-dont-shop/lib.api', dir: 'packages/lib.api' }], [packagesGroup])).toHaveLength(1);
    });

    it('flags a package that escapes every filter', () => {
      const rogue = { name: '@adopt-dont-shop/rogue', dir: 'tools/rogue' };
      expect(findUncoveredPackages([rogue], groups)).toEqual([rogue]);
    });
  });
});
