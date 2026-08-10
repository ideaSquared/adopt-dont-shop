import { describe, expect, it } from 'vitest';

import {
  checkLintFormatScripts,
  checkNoEmitTaskOutputs,
  checkTemplateDepDrift,
  checkToolVersionsDrift,
  checkWorkspaceDriftGuardsCoveredByCiLocal,
  computeExpectedDevVolumeMounts,
  extractCiFilterGroups,
  extractJobBlock,
  filterMatches,
  findGuardScriptFiles,
  findMissingCoverageThresholds,
  findRootScriptForGuardFile,
  findUncoveredPackages,
  isRunByCiLocal,
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
    const rootPkg = {
      dependencies: { react: '^19.2.7' },
      devDependencies: { typescript: '^6.0.3' },
    };
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
    expect(
      checkTemplateDepDrift('scripts/templates/lib/service/package.json', templatePkg, rootPkg)
    ).toEqual([]);
  });

  it('flags a template dependency whose range cannot resolve to the root pin', () => {
    const templatePkg = { devDependencies: { typescript: '^5.0.2' } };
    const failures = checkTemplateDepDrift(
      'scripts/templates/app/standard/package.json',
      templatePkg,
      rootPkg
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(
      "'typescript': '^5.0.2' does not overlap the workspace root's '^6.0.3'"
    );
  });

  it('checks a dependency declared under an override, not just dependencies/devDependencies', () => {
    const templatePkg = { dependencies: { react: '^18.3.1' } };
    const failures = checkTemplateDepDrift(
      'scripts/templates/app/minimal/package.json',
      templatePkg,
      rootPkg
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(
      "'react': '^18.3.1' does not overlap the workspace root's '19.2.7'"
    );
  });

  it('ignores dependencies the root does not track at all', () => {
    const templatePkg = { dependencies: { 'left-pad': '^1.0.0' } };
    expect(
      checkTemplateDepDrift('scripts/templates/lib/utility/package.json', templatePkg, rootPkg)
    ).toEqual([]);
  });
});

describe('checkNoEmitTaskOutputs (ADS-1000)', () => {
  it('flags a --noEmit task that declares dist/ outputs', () => {
    const turboConfig = {
      tasks: {
        'type-check': { dependsOn: ['^build'], outputs: ['**/.tsbuildinfo', 'dist/**/*.d.ts'] },
      },
    };
    const failures = checkNoEmitTaskOutputs(turboConfig);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("'type-check' task declares dist/ output(s)");
  });

  it('passes when the --noEmit task declares no dist/ outputs', () => {
    const turboConfig = {
      tasks: {
        'type-check': { dependsOn: ['^build'], outputs: [] },
      },
    };
    expect(checkNoEmitTaskOutputs(turboConfig)).toEqual([]);
  });

  it('ignores a task with no configured outputs at all', () => {
    const turboConfig = { tasks: { 'type-check': { dependsOn: ['^build'] } } };
    expect(checkNoEmitTaskOutputs(turboConfig)).toEqual([]);
  });

  it('ignores tasks not present in turbo.json', () => {
    expect(checkNoEmitTaskOutputs({ tasks: {} })).toEqual([]);
  });
});

describe('checkToolVersionsDrift (ADS-943)', () => {
  it('passes when nodejs major and pnpm version match .nvmrc / packageManager', () => {
    const failures = checkToolVersionsDrift(
      '22.15.1\n',
      'pnpm@10.34.3',
      'nodejs 22.15.1\npnpm 10.34.3\n'
    );
    expect(failures).toEqual([]);
  });

  it('flags a nodejs major mismatch against .nvmrc', () => {
    const failures = checkToolVersionsDrift(
      '22.15.1\n',
      'pnpm@10.34.3',
      'nodejs 20.11.0\npnpm 10.34.3\n'
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('nodejs');
  });

  it('flags a pnpm version mismatch against package.json packageManager', () => {
    const failures = checkToolVersionsDrift(
      '22.15.1\n',
      'pnpm@10.34.3',
      'nodejs 22.15.1\npnpm 9.0.0\n'
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('pnpm');
  });

  it('flags a missing nodejs or pnpm line', () => {
    const failures = checkToolVersionsDrift('22.15.1\n', 'pnpm@10.34.3', 'pnpm 10.34.3\n');
    expect(failures).toEqual(["[.tool-versions] missing a 'nodejs <version>' line (ADS-943)."]);
  });
});

describe('findMissingCoverageThresholds (ADS-1004)', () => {
  const declared = [
    '      thresholds: {',
    '        statements: 94,',
    '        branches: 89,',
    '        functions: 99,',
    '        lines: 94,',
    '      },',
  ].join('\n');

  it('passes a package that declares all four coverage thresholds', () => {
    expect(
      findMissingCoverageThresholds([
        { path: 'packages/lib.api/vitest.config.ts', contents: declared },
      ])
    ).toEqual([]);
  });

  it('passes a package that deliberately declares all-zero thresholds with a rationale comment', () => {
    const allZero = [
      '      // ADS-717: held at 0 until pre-existing test failures are fixed.',
      '      thresholds: {',
      '        statements: 0,',
      '        branches: 0,',
      '        functions: 0,',
      '        lines: 0,',
      '      },',
    ].join('\n');
    expect(
      findMissingCoverageThresholds([
        { path: 'packages/lib.dev-tools/vitest.config.ts', contents: allZero },
      ])
    ).toEqual([]);
  });

  it('flags a newly-scaffolded service that never overrides the shared 0% default, with the real path', () => {
    const noOverride = [
      "import { defineServiceConfig } from '../../vitest.shared.config';",
      '',
      'export default defineServiceConfig();',
      '',
    ].join('\n');

    const failures = findMissingCoverageThresholds([
      { path: 'services/new-service/vitest.config.ts', contents: noOverride },
    ]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('[services/new-service/vitest.config.ts]');
    expect(failures[0]).toContain('statements, branches, functions, lines');
  });

  it('flags only the metrics that are actually missing', () => {
    const partial = '        statements: 80,\n        branches: 80,\n';
    const failures = findMissingCoverageThresholds([
      { path: 'packages/lib.partial/vitest.config.ts', contents: partial },
    ]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('functions, lines');
    expect(failures[0]).not.toContain('statements,');
  });

  it('flags a package whose vitest.config.ts is missing or unreadable, with the real repo-relative path', () => {
    const failures = findMissingCoverageThresholds([
      { path: 'services/new-service/vitest.config.ts', contents: null },
    ]);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('[services/new-service/vitest.config.ts]');
    expect(failures[0]).toContain('missing or unreadable');
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
      expect(
        filterMatches('@adopt-dont-shop/lib.*', {
          name: '@adopt-dont-shop/lib.api',
          dir: 'packages/lib.api',
        })
      ).toBe(true);
      expect(
        filterMatches('@adopt-dont-shop/lib.*', {
          name: '@adopt-dont-shop/authz',
          dir: 'packages/authz',
        })
      ).toBe(false);
    });

    it('matches a brace-list against the package name', () => {
      const f = '@adopt-dont-shop/app.{client,admin,rescue}';
      expect(filterMatches(f, { name: '@adopt-dont-shop/app.admin', dir: 'apps/admin' })).toBe(
        true
      );
      expect(
        filterMatches(f, { name: '@adopt-dont-shop/app.marketing', dir: 'apps/marketing' })
      ).toBe(false);
    });

    it('matches a path selector against the package directory', () => {
      expect(
        filterMatches('./packages/*', { name: '@adopt-dont-shop/authz', dir: 'packages/authz' })
      ).toBe(true);
      expect(
        filterMatches('./packages/*', {
          name: '@adopt-dont-shop/service.auth',
          dir: 'services/auth',
        })
      ).toBe(false);
    });
  });

  describe('extractCiFilterGroups', () => {
    it('groups each job filter and expands the frontend matrix', () => {
      const groups = extractCiFilterGroups(ci);
      expect(groups).toContainEqual({
        includes: [
          '@adopt-dont-shop/app.client',
          '@adopt-dont-shop/app.admin',
          '@adopt-dont-shop/app.rescue',
        ],
        excludes: [],
      });
      expect(groups).toContainEqual({
        includes: ['./packages/*'],
        excludes: ['@adopt-dont-shop/lib.*'],
      });
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
      expect(
        findUncoveredPackages(
          [{ name: '@adopt-dont-shop/lib.api', dir: 'packages/lib.api' }],
          [packagesGroup]
        )
      ).toHaveLength(1);
    });

    it('flags a package that escapes every filter', () => {
      const rogue = { name: '@adopt-dont-shop/rogue', dir: 'tools/rogue' };
      expect(findUncoveredPackages([rogue], groups)).toEqual([rogue]);
    });
  });
});

describe('workspace-drift guard / ci:local parity (ADS-1002)', () => {
  const ciYaml = [
    'jobs:',
    '  workspace-drift:',
    '    steps:',
    '      - name: Verify workspace consistency',
    '        run: node scripts/check-workspace-consistency.mjs',
    '      - name: Verify CSP headers',
    '        run: pnpm check:csp',
    '  changes:',
    '    steps:',
    '      - run: node scripts/check-docs-freshness.mjs --check-external',
  ].join('\n');

  describe('extractJobBlock', () => {
    it('extracts only the named job, stopping at the next top-level job key', () => {
      const block = extractJobBlock(ciYaml, 'workspace-drift');
      expect(block).toContain('check-workspace-consistency.mjs');
      expect(block).toContain('pnpm check:csp');
      expect(block).not.toContain('check-docs-freshness.mjs');
    });

    it('returns null when the job is not found', () => {
      expect(extractJobBlock(ciYaml, 'no-such-job')).toBeNull();
    });
  });

  describe('findGuardScriptFiles', () => {
    const rootScripts = {
      'check:csp': 'node scripts/check-csp-headers.mjs',
      'check:workspaces': 'node scripts/check-workspace-consistency.mjs',
    };

    it('finds guard files invoked directly with node', () => {
      expect(
        findGuardScriptFiles('run: node scripts/check-workspace-consistency.mjs', rootScripts)
      ).toEqual(['check-workspace-consistency.mjs']);
    });

    it('resolves guard files invoked indirectly via a wrapping pnpm script', () => {
      expect(findGuardScriptFiles('run: pnpm check:csp', rootScripts)).toEqual([
        'check-csp-headers.mjs',
      ]);
    });

    it('ignores a pnpm script reference with no matching root script', () => {
      expect(findGuardScriptFiles('run: pnpm check:unknown', rootScripts)).toEqual([]);
    });
  });

  describe('findRootScriptForGuardFile', () => {
    it('finds the script name wrapping a given guard file', () => {
      const rootScripts = { 'check:csp': 'node scripts/check-csp-headers.mjs' };
      expect(findRootScriptForGuardFile('check-csp-headers.mjs', rootScripts)).toBe('check:csp');
    });

    it('returns null when no root script wraps the file', () => {
      expect(findRootScriptForGuardFile('check-new-guard.mjs', {})).toBeNull();
    });
  });

  describe('isRunByCiLocal', () => {
    it('is true when ci:local invokes the script by name', () => {
      expect(
        isRunByCiLocal('check:csp', 'pnpm format:check && pnpm check:csp && pnpm test:scripts')
      ).toBe(true);
    });

    it('is false when ci:local does not invoke the script', () => {
      expect(isRunByCiLocal('check:csp', 'pnpm format:check && pnpm test:scripts')).toBe(false);
    });
  });

  describe('checkWorkspaceDriftGuardsCoveredByCiLocal', () => {
    it('passes when every workspace-drift guard has a ci:local-covered root script', () => {
      const rootPkg = {
        scripts: {
          'check:csp': 'node scripts/check-csp-headers.mjs',
          'check:workspaces': 'node scripts/check-workspace-consistency.mjs',
          'ci:local': 'pnpm format:check && pnpm check:workspaces && pnpm check:csp',
        },
      };
      expect(checkWorkspaceDriftGuardsCoveredByCiLocal(ciYaml, rootPkg)).toEqual([]);
    });

    it('fails when a guard script has no wrapping root package.json script', () => {
      const yaml = [
        'jobs:',
        '  workspace-drift:',
        '    steps:',
        '      - run: node scripts/check-new-guard.mjs',
      ].join('\n');
      const rootPkg = { scripts: { 'ci:local': 'pnpm format:check' } };
      const failures = checkWorkspaceDriftGuardsCoveredByCiLocal(yaml, rootPkg);
      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain('scripts/check-new-guard.mjs');
      expect(failures[0]).toContain('no root package.json script wraps it');
    });

    it('fails when the wrapping root script exists but ci:local does not run it', () => {
      const yaml = [
        'jobs:',
        '  workspace-drift:',
        '    steps:',
        '      - run: pnpm check:new-guard',
      ].join('\n');
      const rootPkg = {
        scripts: {
          'check:new-guard': 'node scripts/check-new-guard.mjs',
          'ci:local': 'pnpm format:check',
        },
      };
      const failures = checkWorkspaceDriftGuardsCoveredByCiLocal(yaml, rootPkg);
      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain("does not run 'check:new-guard'");
    });

    it('fails with a clear message when the workspace-drift job cannot be found', () => {
      const failures = checkWorkspaceDriftGuardsCoveredByCiLocal(
        'jobs:\n  changes:\n    steps: []',
        {
          scripts: {},
        }
      );
      expect(failures).toEqual([
        "[ci.yml] could not find the 'workspace-drift' job — expected a top-level '  workspace-drift:' key (ADS-1002).",
      ]);
    });
  });
});

describe('checkLintFormatScripts (ADS-1003)', () => {
  it('reports no drift when lint, format and format:check are all present', () => {
    const scripts = {
      lint: 'eslint .',
      format: 'prettier --write .',
      'format:check': 'prettier --check .',
    };
    expect(checkLintFormatScripts('e2e', scripts)).toEqual([]);
  });

  it('flags every missing script by name', () => {
    const failures = checkLintFormatScripts('e2e', { test: 'playwright test' });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('[e2e] missing scripts: lint, format, format:check');
  });

  it('flags only the scripts that are actually missing', () => {
    const failures = checkLintFormatScripts('services/auth', { lint: 'eslint src' });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('missing scripts: format, format:check');
  });
});
