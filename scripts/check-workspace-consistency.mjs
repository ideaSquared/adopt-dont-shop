#!/usr/bin/env node
/**
 * Workspace consistency guard (ADS-622).
 *
 * Fails CI when any of the following drift between filesystem and config:
 *
 *  1. Required scripts per package class.
 *     - lib.*: build, dev, clean, test, test:watch, test:coverage, lint,
 *       lint:fix, format, format:check, type-check, prepublishOnly.
 *     - app.*: dev, build, preview, test, test:watch, test:coverage, test:ui,
 *       lint, lint:fix, format, format:check, type-check, clean.
 *  2. vitest.workspace.ts references every lib.* package that has a
 *     vitest.config.ts on disk.
 *  3. vite.shared.config.ts getLibraryAliases() has an entry for every lib.*.
 *  3b. No app.* vitest.config.ts hand-rolls @adopt-dont-shop/lib.* aliases —
 *      they must come from getLibraryAliases() (ADS-762).
 *  3c. No app.* / lib.* package.json lists an @types/* package in
 *      `dependencies` — type packages belong in devDependencies (ADS-765).
 *  3d. No workspace package.json declares `happy-dom` — jsdom is the
 *      canonical test-DOM environment (ADS-764).
 *  4. No nested lockfiles (pnpm-lock.yaml / package-lock.json) outside the repo root.
 *  5. No stale Jest references in source (excluding docs/ and *.md changelog files).
 *  6. No *.test.ts(x) / *.spec.ts(x) files outside src/ (ADS-737). The shared
 *     Vitest `include` glob only picks up tests under src/, so files elsewhere
 *     are silently skipped. Existing offenders are tracked in
 *     TEST_LAYOUT_ALLOWLIST and migrated by separate tickets.
 *  9. docker-compose.dev.yml's `x-dev-volumes` anchor mounts an anonymous
 *     node_modules volume per workspace package (ADS-987). Nothing kept that
 *     hand-enumerated list in sync with the filesystem — a new package added
 *     without a matching mount line gets silently shadowed by the host bind
 *     mount's (container-invalid) node_modules symlink farm.
 *  10. scripts/templates/**\/package.json (the pnpm new-app / new-lib
 *     scaffolds) must not declare a version of a tracked cross-cutting
 *     dependency (react, typescript, eslint, vitest, ...) that doesn't
 *     overlap the workspace root's own pinned range/override (ADS-980).
 *  11. .tool-versions (asdf/mise) must declare the same Node major and pnpm
 *     version as .nvmrc / package.json "packageManager" (ADS-943).
 *  12. Every services/*.vitest.config.ts imports defineServiceConfig from
 *     vitest.shared.config.ts — no ad-hoc defineConfig at service scope
 *     (ADS-985).
 *  14. Every services/* and packages/lib.* declares coverage thresholds in
 *     its own vitest.config.ts — the shared default is 0%, so an override
 *     is mandatory (ADS-1004).
 *  15. Every services/*, e2e and non-lib.* packages/* package.json ships
 *     lint, format and format:check scripts (ADS-1003 / ADS-1062) — lib.*
 *     and app.* already require these via their check #1 script lists. The
 *     non-lib shared packages (eslint-config-*, db, authz, …) are included
 *     so their source is actually linted and format-checked.
 *
 * Common script bodies (lint = 'eslint .'|'eslint src', type-check =
 * 'tsc --noEmit', test = 'vitest run') drift produces a warning, not failure.
 *
 * Mirrors the pattern of scripts/check-lib-tests.mjs.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

import {
  extractThresholdsFromSource,
  missingCoverageMetrics,
} from './lib/ratchet-coverage-core.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_LIB_SCRIPTS = [
  'build',
  'dev',
  'clean',
  'test',
  'test:watch',
  'test:coverage',
  'lint',
  'lint:fix',
  'format',
  'format:check',
  'type-check',
  'prepublishOnly',
];

const REQUIRED_APP_SCRIPTS = [
  'dev',
  'build',
  'preview',
  'test',
  'test:watch',
  'test:coverage',
  'test:ui',
  'lint',
  'lint:fix',
  'format',
  'format:check',
  'type-check',
  'clean',
];

const EXPECTED_SCRIPT_BODIES = {
  'type-check': ['tsc --noEmit'],
  test: ['vitest run'],
};

// ADS-793: the canonical Prettier glob for lib.* packages. Unlike the bodies
// above (warnings on drift), format/format:check drift is a HARD failure for
// lib.* so the standardised glob can't silently regress. Apps use a wider glob
// (they ship .js/.jsx config), so this guard is lib-only — keep it out of
// EXPECTED_SCRIPT_BODIES, which is checked for both families.
const EXPECTED_LIB_FORMAT_BODIES = {
  format: 'prettier --write "src/**/*.{ts,tsx,json}"',
  'format:check': 'prettier --check "src/**/*.{ts,tsx,json}"',
};

const EXPECTED_LINT_BODIES = ['eslint .', 'eslint src'];

// ADS-1003: services/* and e2e aren't covered by REQUIRED_LIB_SCRIPTS /
// REQUIRED_APP_SCRIPTS (their other required scripts differ per package —
// e.g. services ship db:migrate, e2e ships test:smoke), but every workspace
// must still ship lint/format/format:check so `pnpm lint` / `pnpm
// format:check` never silently skip a package — e2e shipped none of the
// three until this ticket.
const REQUIRED_LINT_FORMAT_SCRIPTS = ['lint', 'format', 'format:check'];

export function checkLintFormatScripts(dir, scripts) {
  const missing = REQUIRED_LINT_FORMAT_SCRIPTS.filter(name => !scripts[name]);
  return missing.length > 0 ? [`[${dir}] missing scripts: ${missing.join(', ')} (ADS-1003)`] : [];
}

// After the Phase 0 restructure (apps/ + packages/lib.* + services/), libs
// live under packages/ and apps live under apps/. The functions below still
// return workspace identifiers in `lib.X` / `app.X` form (the package-name
// suffix) — callers join them with `pkgDir(...)` to get the filesystem path.
function listLibs() {
  return readdirSync(join(ROOT, 'packages'), { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith('lib.'))
    .map(e => e.name)
    .sort();
}

function listApps() {
  return readdirSync(join(ROOT, 'apps'), { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => `app.${e.name}`)
    .sort();
}

function listServices() {
  return readdirSync(join(ROOT, 'services'), { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();
}

// Every directory under packages/ — not just lib.* — has its own node_modules
// (authz, config-secrets, db, eslint-config-*, events, observability, proto,
// seed-faker, service-bootstrap, storage, plus every lib.*). Used by the
// dev-volumes drift guard (ADS-987), which mirrors every workspace package's
// node_modules, not just the lib.* subset `listLibs()` returns.
function listAllPackages() {
  return readdirSync(join(ROOT, 'packages'), { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();
}

function pkgDir(workspace) {
  if (workspace.startsWith('lib.')) return join('packages', workspace);
  if (workspace.startsWith('app.')) return join('apps', workspace.slice(4));
  return workspace;
}

function readPkg(workspace) {
  const path = join(ROOT, pkgDir(workspace), 'package.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

function checkRequiredScripts(workspace, required) {
  const pkg = readPkg(workspace);
  const scripts = pkg.scripts || {};
  const missing = required.filter(name => !scripts[name]);
  return { workspace, scripts, missing };
}

function checkScriptBodyDrift(workspace, scripts) {
  const warnings = [];
  for (const [name, expectedBodies] of Object.entries(EXPECTED_SCRIPT_BODIES)) {
    const body = scripts[name];
    if (body && !expectedBodies.includes(body)) {
      warnings.push({ workspace, script: name, actual: body, expected: expectedBodies });
    }
  }
  const lintBody = scripts.lint;
  if (lintBody && !EXPECTED_LINT_BODIES.includes(lintBody)) {
    warnings.push({ workspace, script: 'lint', actual: lintBody, expected: EXPECTED_LINT_BODIES });
  }
  return warnings;
}

// ADS-793: fatal lib-only check that format/format:check use the canonical glob.
function checkLibFormatBodies(lib, scripts) {
  const failures = [];
  for (const [name, expected] of Object.entries(EXPECTED_LIB_FORMAT_BODIES)) {
    const body = scripts[name];
    if (body && body !== expected) {
      failures.push(
        `[${lib}] '${name}' body is '${body}', expected '${expected}' (ADS-793 canonical format glob)`
      );
    }
  }
  return failures;
}

function checkVitestWorkspace(libs) {
  const path = join(ROOT, 'vitest.workspace.ts');
  const contents = readFileSync(path, 'utf8');
  // A `packages/lib.*/vitest.config.ts` glob entry transparently covers every
  // lib with a vitest config on disk, so explicit per-lib entries
  // aren't required when the glob is present.
  if (/['"]packages\/lib\.\*\/vitest\.config\.ts['"]/.test(contents)) {
    return [];
  }
  const missing = libs.filter(lib => {
    try {
      statSync(join(ROOT, pkgDir(lib), 'vitest.config.ts'));
    } catch {
      return false;
    }
    return !contents.includes(`packages/${lib}/vitest.config.ts`);
  });
  return missing;
}

function checkViteAliases(libs) {
  const path = join(ROOT, 'vite.shared.config.ts');
  const contents = readFileSync(path, 'utf8');
  return libs.filter(lib => !contents.includes(`'@adopt-dont-shop/${lib}'`));
}

// ADS-764: jsdom is the canonical test-DOM environment. happy-dom must not
// re-appear in any workspace package.json.
function checkBannedDomEnv(workspaces) {
  const offenders = [];
  for (const ws of workspaces) {
    const pkg = readPkg(ws);
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if ('happy-dom' in deps) {
      offenders.push(ws);
    }
  }
  return offenders;
}

// ADS-765: @types/* packages must live in devDependencies, not dependencies —
// they're type-only and leak into the public type surface of every consumer
// when placed in runtime deps.
function checkTypesInDependencies(workspaces) {
  const offenders = [];
  for (const ws of workspaces) {
    const pkg = readPkg(ws);
    const deps = pkg.dependencies || {};
    const stray = Object.keys(deps).filter(k => k.startsWith('@types/'));
    if (stray.length > 0) {
      offenders.push({ workspace: ws, types: stray.sort() });
    }
  }
  return offenders;
}

// ADS-762: app vitest.config.ts files must build their `@adopt-dont-shop/lib.*`
// aliases via getLibraryAliases(__dirname, 'development'), not hand-rolled
// entries. The lone exception is `lib.components/theme` which is a sub-path
// alias not covered by the helper.
function checkAppVitestAliases(apps) {
  const offenders = [];
  for (const app of apps) {
    const cfgPath = join(ROOT, pkgDir(app), 'vitest.config.ts');
    let contents;
    try {
      contents = readFileSync(cfgPath, 'utf8');
    } catch {
      continue;
    }
    const re = /['"]@adopt-dont-shop\/(lib\.[a-z-]+)['"]/g;
    const found = new Set();
    let m;
    while ((m = re.exec(contents)) !== null) {
      found.add(m[1]);
    }
    if (found.size > 0) {
      offenders.push({ app, libs: [...found].sort() });
    }
  }
  return offenders;
}

function findNestedLockfiles() {
  const found = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if ((entry.name === 'pnpm-lock.yaml' || entry.name === 'package-lock.json') && dir !== ROOT) {
        found.push(relative(ROOT, full));
      }
    }
  }
  walk(ROOT);
  return found;
}

// Files that may name "jest" for legitimate reasons (this guard itself,
// or files holding known-stale references tracked in a separate cleanup
// ticket). Add to this set sparingly — every entry is a deferred TODO.
const JEST_REF_FILE_ALLOWLIST = new Set([
  'scripts/check-workspace-consistency.mjs',
  // Mocks + tests still using jest.fn / jest.mock via Vitest's jest-compat
  // globals. Functional today; explicit migration to vi.fn / vi.mock is a
  // follow-up to ADS-617 (Jest cleanup).
  'apps/rescue/src/__mocks__/lib-applications.ts',
  'apps/rescue/src/__mocks__/lib-auth.ts',
  'apps/rescue/src/__mocks__/lib-pets.ts',
  'apps/rescue/src/__mocks__/lib-rescue.ts',
  'apps/rescue/src/setup-tests.tsx',
  'apps/rescue/src/test-utils/setup-tests.ts',
  // Documentation-style comments referencing jest.mock semantics in
  // tests that are themselves Vitest. Pure prose, no wiring.
  'packages/lib.feature-flags/src/hooks/useDynamicConfig.test.ts',
  'packages/lib.feature-flags/src/hooks/useFeatureGate.test.ts',
]);

// Patterns that indicate active Jest wiring (as opposed to merely
// mentioning the word "jest" in a comment, an extension recommendation,
// or the `@testing-library/jest-dom` package which works with Vitest).
const JEST_USAGE_PATTERNS = [
  /\bjest\.(fn|mock|spyOn|requireActual|requireMock|doMock|dontMock|isolateModules|clearAllMocks|resetAllMocks|restoreAllMocks|useFakeTimers|useRealTimers|advanceTimersByTime)\b/,
  /from ['"]@?jest\/(?!dom)[a-z-]+['"]/,
  /require\(['"]@?jest\/(?!dom)[a-z-]+['"]\)/,
  /['"]@types\/jest['"]/,
  /['"]jest-environment-[a-z-]+['"]/,
  /['"]jest-preset-[a-z-]+['"]/,
  /['"]ts-jest['"]/,
];

function findJestReferences() {
  // Walk tracked, source-relevant files for genuine Jest wiring.
  // We avoid spawning git so the script is runnable on any checkout.
  const matches = [];
  function shouldSkip(name) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') return true;
    if (name === 'docs') return true;
    if (name.endsWith('.md')) return true;
    if (name === 'package-lock.json' || name === 'pnpm-lock.yaml') return true;
    if (name === 'CHANGELOG' || name.startsWith('CHANGELOG')) return true;
    return false;
  }
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (shouldSkip(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|yml|yaml)$/.test(entry.name)) continue;
      const rel = relative(ROOT, full);
      if (JEST_REF_FILE_ALLOWLIST.has(rel)) continue;
      const contents = readFileSync(full, 'utf8');
      if (JEST_USAGE_PATTERNS.some(p => p.test(contents))) {
        matches.push(rel);
      }
    }
  }
  walk(ROOT);
  return matches;
}

// Test files (`*.test.ts(x)` / `*.spec.ts(x)`) must live inside a `src/`
// directory so vitest.shared.config.ts picks them up. Pre-existing offenders
// stay allowlisted until their separate cleanup ticket lands (e.g. ADS-725
// for lib.auth/__tests__). New offenders fail the guard.
const TEST_LAYOUT_ALLOWLIST = new Set([
  'packages/lib.auth/__tests__/auth-service.test.ts', // ADS-725 will relocate this
]);

function findStrayTests(workspaces) {
  const stray = [];
  const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|jsx)$/;
  function walk(dir, root) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.turbo')
        continue;
      if (entry.name === 'src') continue; // src/ is the allowed location
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, root);
        continue;
      }
      if (!TEST_FILE_RE.test(entry.name)) continue;
      const rel = relative(ROOT, full);
      if (TEST_LAYOUT_ALLOWLIST.has(rel)) continue;
      stray.push(rel);
    }
  }
  for (const ws of workspaces) {
    try {
      walk(join(ROOT, pkgDir(ws)), ws);
    } catch {
      // Workspace dir missing — other guards will catch it.
    }
  }
  return stray;
}

// ADS-981: every service must have src/instrumentation.ts and preload it via
// --import in both its dev and start scripts.
function checkServiceInstrumentation(services) {
  const failures = [];
  for (const svc of services) {
    const svcDir = join(ROOT, 'services', svc);
    const instrFile = join(svcDir, 'src', 'instrumentation.ts');
    if (!existsSync(instrFile)) {
      failures.push(
        `[services/${svc}] missing src/instrumentation.ts — add OTel bootstrap (ADS-981)`
      );
    }
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(join(svcDir, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    const scripts = pkg.scripts || {};
    if (scripts.dev && !scripts.dev.includes('--import ./src/instrumentation.ts')) {
      failures.push(
        `[services/${svc}] 'dev' script missing '--import ./src/instrumentation.ts' (ADS-981): ${scripts.dev}`
      );
    }
    if (scripts.start && !scripts.start.includes('--import ./dist/instrumentation.js')) {
      failures.push(
        `[services/${svc}] 'start' script missing '--import ./dist/instrumentation.js' (ADS-981): ${scripts.start}`
      );
    }
  }
  return failures;
}

// ADS-987: parse the `x-dev-volumes` anchor block out of docker-compose.dev.yml
// without pulling in a YAML dependency — mirrors the hand-rolled parser in
// scripts/check-workflow-paths.mjs. Returns the raw mount target for each
// `- <target>` list item between the anchor's `x-dev-volumes:` line and the
// next top-level (unindented) key, or null if the anchor isn't found.
export function parseDevVolumesAnchor(composeYaml) {
  const lines = composeYaml.split('\n');
  const startIdx = lines.findIndex(l => l.trim().startsWith('x-dev-volumes:'));
  if (startIdx === -1) return null;

  const mounts = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 0 && /^\S/.test(line)) break; // dedent = next top-level key
    const match = line.match(/^\s+-\s+(\S+)\s*$/);
    if (match) mounts.push(match[1]);
  }
  return mounts;
}

// The node_modules mounts every dev container needs: the root, one per app,
// one for e2e, one per packages/* directory, and one per service. Mirrors the
// `/app/<workspace>/node_modules` convention already used in
// docker-compose.dev.yml's x-dev-volumes anchor.
export function computeExpectedDevVolumeMounts(apps, packages, services) {
  const appNames = apps.map(app => app.slice('app.'.length));
  return [
    '/app/node_modules',
    ...appNames.map(name => `/app/apps/${name}/node_modules`),
    '/app/e2e/node_modules',
    ...packages.map(name => `/app/packages/${name}/node_modules`),
    ...services.map(name => `/app/services/${name}/node_modules`),
  ];
}

function checkDevVolumesDrift(apps, packages, services) {
  const composePath = join(ROOT, 'docker-compose.dev.yml');
  const contents = readFileSync(composePath, 'utf8');
  const actualMounts = parseDevVolumesAnchor(contents);
  if (actualMounts === null) {
    return [
      "[docker-compose.dev.yml] could not find the 'x-dev-volumes' anchor — expected a top-level 'x-dev-volumes:' key (ADS-987).",
    ];
  }

  const actualSet = new Set(actualMounts.filter(mount => mount !== '.:/app'));
  const expected = computeExpectedDevVolumeMounts(apps, packages, services);
  const expectedSet = new Set(expected);
  const failures = [];

  const missing = expected.filter(mount => !actualSet.has(mount));
  if (missing.length > 0) {
    failures.push(
      `[docker-compose.dev.yml] 'x-dev-volumes' anchor is missing node_modules mount(s) for: ${missing.join(', ')}. ` +
        `Add these lines under the x-dev-volumes anchor — without them the host bind mount shadows the ` +
        `image's baked node_modules for these workspaces (ADS-987).`
    );
  }

  const stale = [...actualSet].filter(mount => mount !== '/app/node_modules' && !expectedSet.has(mount)).sort();
  if (stale.length > 0) {
    failures.push(
      `[docker-compose.dev.yml] 'x-dev-volumes' anchor mounts node_modules for workspace(s) that no longer exist: ` +
        `${stale.join(', ')}. Remove these stale lines (ADS-987).`
    );
  }

  return failures;
}

// ADS-980: cross-cutting dependencies that scripts/templates/**/package.json
// (the pnpm new-app / new-lib scaffolds) must keep in step with the
// workspace root, so a freshly generated package doesn't immediately violate
// pnpm's overrides or ship a version nothing else in the repo uses.
const TEMPLATE_TRACKED_DEPS = [
  'react',
  'react-dom',
  'react-router',
  'typescript',
  'eslint',
  'vitest',
  '@vitest/coverage-v8',
  '@vitest/ui',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  '@vitejs/plugin-react',
  'vite',
  '@testing-library/react',
  '@testing-library/jest-dom',
  '@testing-library/user-event',
  '@tanstack/react-query',
  'eslint-plugin-react-hooks',
  'eslint-plugin-react-refresh',
];

// The version range the workspace root actually resolves `depName` to: an
// explicit pnpm.overrides entry wins (that's what every install gets,
// regardless of what a consumer declares), otherwise fall back to root
// package.json's own dependencies/devDependencies. Returns null when the
// root doesn't pin the dependency at all — nothing to compare against.
export function rootAuthoritativeRange(rootPkg, depName) {
  const override = rootPkg.pnpm?.overrides?.[depName];
  if (typeof override === 'string') return override;
  return rootPkg.dependencies?.[depName] ?? rootPkg.devDependencies?.[depName] ?? null;
}

// First integer in a range string ('^19.2.7' → 19, '>=10 <11' → 10). Null
// when the range carries no leading number (workspace:*, latest, git URLs).
function majorOf(range) {
  const match = String(range).match(/\d+/);
  return match ? Number(match[0]) : null;
}

// Compare every tracked dependency a template package.json declares against
// the workspace root's authoritative range. Returns human-readable failure
// strings; an empty array means this template has no drift.
export function checkTemplateDepDrift(templateFile, templatePkg, rootPkg) {
  const failures = [];
  const declared = { ...(templatePkg.dependencies || {}), ...(templatePkg.devDependencies || {}) };
  for (const dep of TEMPLATE_TRACKED_DEPS) {
    const templateRange = declared[dep];
    if (!templateRange) continue;
    const rootRange = rootAuthoritativeRange(rootPkg, dep);
    if (!rootRange) continue;
    // Dependency-free on purpose: CI's workspace-drift job runs this script
    // without node_modules, so the semver package isn't available. Major-
    // version equality catches the drift class this guard exists for
    // (templates stuck on an old major); exact string equality covers
    // ranges with no leading number.
    const templateMajor = majorOf(templateRange);
    const overlaps =
      templateRange === rootRange ||
      (templateMajor !== null && templateMajor === majorOf(rootRange));
    if (!overlaps) {
      failures.push(
        `[${templateFile}] '${dep}': '${templateRange}' does not overlap the workspace root's ` +
          `'${rootRange}' (ADS-980) — update the template to the current pinned version.`
      );
    }
  }
  return failures;
}

// ADS-985: every services/*/vitest.config.ts must import defineServiceConfig
// from the shared vitest.shared.config.ts helper — no ad-hoc defineConfig()
// at service scope, so a Vitest upgrade or coverage-exclusion change stays a
// single-file edit.
function checkServiceVitestConfig(services) {
  const failures = [];
  for (const svc of services) {
    const cfgPath = join(ROOT, 'services', svc, 'vitest.config.ts');
    let contents;
    try {
      contents = readFileSync(cfgPath, 'utf8');
    } catch {
      continue;
    }
    const importsSharedHelper = /from ['"]\.\.\/\.\.\/vitest\.shared\.config['"]/.test(contents);
    if (!importsSharedHelper) {
      failures.push(
        `[services/${svc}/vitest.config.ts] must import 'defineServiceConfig' from '../../vitest.shared.config' ` +
          `(ADS-985) — no ad-hoc defineConfig() at service scope`
      );
    }
  }
  return failures;
}

// ADS-1004: every services/* and packages/lib.* package must declare its own
// coverage thresholds in its own vitest.config.ts — the shared
// vitest.shared.config.ts default is 0%, so a package that never overrides it
// would silently gate at 0% forever with no signal. A deliberate all-zero
// override with a rationale comment (e.g. lib.dev-tools) still counts as
// "declared"; this only catches a package that never overrides it at all.
//
// `contents` is `null` when the package's vitest.config.ts is missing or
// unreadable — that is itself a failure, not something to skip silently, so
// a package can't dodge the guard just by lacking a config file.
//
// `path` is the repo-relative path to that package's vitest.config.ts (e.g.
// `services/auth/vitest.config.ts`, `packages/lib.api/vitest.config.ts`),
// used verbatim in failure messages so they point at a real, actionable
// file location instead of a bare workspace name.
export function findMissingCoverageThresholds(configs) {
  return configs.flatMap(({ path, contents }) => {
    if (contents === null) {
      return [
        `[${path}] missing or unreadable — every services/* and packages/lib.* ` +
          `package must declare its own coverage thresholds in a vitest.config.ts (ADS-1004).`,
      ];
    }
    const missing = missingCoverageMetrics(extractThresholdsFromSource(contents));
    if (missing.length === 0) {
      return [];
    }
    return [
      `[${path}] missing coverage threshold(s): ${missing.join(', ')} — every ` +
        `services/* and packages/lib.* package must declare its own coverage thresholds (ADS-1004). ` +
        `See CONTRIBUTING.md "Coverage thresholds".`,
    ];
  });
}

function checkCoverageThresholds(libs, services) {
  const targets = [
    ...libs.map(lib => join(ROOT, pkgDir(lib), 'vitest.config.ts')),
    ...services.map(svc => join(ROOT, 'services', svc, 'vitest.config.ts')),
  ];
  const configs = targets.map(absolutePath => {
    const path = relative(ROOT, absolutePath);
    try {
      return { path, contents: readFileSync(absolutePath, 'utf8') };
    } catch {
      return { path, contents: null };
    }
  });
  return findMissingCoverageThresholds(configs);
}

function findTemplatePackageJsonFiles() {
  const templatesDir = join(ROOT, 'scripts', 'templates');
  const found = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name === 'package.json') found.push(full);
    }
  }
  walk(templatesDir);
  return found;
}

function checkTemplateDepsDrift(rootPkg) {
  const failures = [];
  for (const file of findTemplatePackageJsonFiles()) {
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    failures.push(...checkTemplateDepDrift(relative(ROOT, file), pkg, rootPkg));
  }
  return failures;
}

// ADS-943: .tool-versions (asdf/mise) must agree with .nvmrc and package.json
// "packageManager" on Node major and pnpm version — otherwise asdf/mise
// contributors silently provision a different toolchain than nvm/Corepack
// users on the same checkout.
export function checkToolVersionsDrift(nvmrcContents, packageManagerField, toolVersionsContents) {
  const failures = [];
  const lines = toolVersionsContents.split('\n');
  const nodeLine = lines.find(l => l.trim().startsWith('nodejs '));
  const pnpmLine = lines.find(l => l.trim().startsWith('pnpm '));

  if (!nodeLine) {
    failures.push("[.tool-versions] missing a 'nodejs <version>' line (ADS-943).");
  } else {
    const toolNodeVersion = nodeLine.trim().split(/\s+/)[1];
    const nvmrcVersion = nvmrcContents.trim();
    if (toolNodeVersion?.split('.')[0] !== nvmrcVersion.split('.')[0]) {
      failures.push(
        `[.tool-versions] nodejs '${toolNodeVersion}' major version doesn't match .nvmrc '${nvmrcVersion}' (ADS-943).`
      );
    }
  }

  if (!pnpmLine) {
    failures.push("[.tool-versions] missing a 'pnpm <version>' line (ADS-943).");
  } else {
    const toolPnpmVersion = pnpmLine.trim().split(/\s+/)[1];
    const pinnedPnpmVersion = packageManagerField?.replace(/^pnpm@/, '');
    if (toolPnpmVersion !== pinnedPnpmVersion) {
      failures.push(
        `[.tool-versions] pnpm '${toolPnpmVersion}' doesn't match package.json "packageManager" ` +
          `'${packageManagerField}' (ADS-943).`
      );
    }
  }

  return failures;
}

function checkToolVersions(rootPkg) {
  const toolVersionsPath = join(ROOT, '.tool-versions');
  if (!existsSync(toolVersionsPath)) {
    return [
      '[.tool-versions] file missing at repo root — add nodejs/pnpm pins for asdf/mise contributors (ADS-943).',
    ];
  }
  const nvmrc = readFileSync(join(ROOT, '.nvmrc'), 'utf8');
  const toolVersions = readFileSync(toolVersionsPath, 'utf8');
  return checkToolVersionsDrift(nvmrc, rootPkg.packageManager, toolVersions);
}

// ADS-1029: every workspace package that ships tests must be reachable by at
// least one of ci.yml's Turbo test filters — otherwise its tests run in CI
// zero times, as ten packages/* did before the test-packages job existed. The
// functions below parse the filters CI passes to the run-package-tests
// composite and assert coverage, so a newly-added package that escapes every
// filter fails the guard instead of silently merging untested.

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Convert a Turbo glob (supports `*` and `{a,b,c}`) to an anchored RegExp.
// `star` is the replacement for `*` — `[^/]+` for path selectors (a segment
// must exist), `[^/]*` for name selectors.
function globToRegExp(glob, star) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      out += star;
    } else if (c === '{') {
      const end = glob.indexOf('}', i);
      const alts = glob.slice(i + 1, end).split(',');
      out += '(' + alts.map(a => escapeRe(a.trim())).join('|') + ')';
      i = end;
    } else {
      out += escapeRe(c);
    }
  }
  return new RegExp(`^${out}$`);
}

// Does a Turbo filter select this package? Path selectors (`./packages/*`)
// match the package directory; name selectors match the package name.
export function filterMatches(filter, pkg) {
  if (filter.startsWith('./')) {
    return globToRegExp(filter.slice(2), '[^/]+').test(pkg.dir);
  }
  return globToRegExp(filter, '[^/]*').test(pkg.name);
}

// Expand a `${{ matrix.<key> }}` reference in a filter into the concrete values
// declared by that job's `matrix.<key>: [a, b, c]` list.
function expandMatrix(filter, ciYaml) {
  const ref = filter.match(/\$\{\{\s*matrix\.(\w+)\s*\}\}/);
  if (!ref) return [filter];
  const list = ciYaml.match(new RegExp(`${ref[1]}:\\s*\\[([^\\]]+)\\]`));
  if (!list) return [filter];
  return list[1].split(',').map(v => filter.replace(ref[0], v.trim()));
}

// Parse ci.yml into per-job filter groups. Each run-package-tests usage
// contributes one group: its `filter:` (plus a non-negated `additional-filter:`)
// are includes; a `!`-prefixed `additional-filter:` is an exclude.
export function extractCiFilterGroups(ciYaml) {
  const groups = [];
  let current = null;
  for (const line of ciYaml.split('\n')) {
    const f = line.match(/^\s*filter:\s*'([^']+)'/);
    if (f) {
      current = { includes: [...expandMatrix(f[1], ciYaml)], excludes: [] };
      groups.push(current);
      continue;
    }
    const af = line.match(/^\s*additional-filter:\s*'([^']+)'/);
    if (af && current) {
      const value = af[1];
      const bucket = value.startsWith('!') ? current.excludes : current.includes;
      bucket.push(...expandMatrix(value.replace(/^!/, ''), ciYaml));
    }
  }
  return groups;
}

// A package is reachable if some group includes it and doesn't exclude it.
export function findUncoveredPackages(pkgs, groups) {
  return pkgs.filter(
    pkg =>
      !groups.some(
        g =>
          g.includes.some(f => filterMatches(f, pkg)) &&
          !g.excludes.some(f => filterMatches(f, pkg))
      )
  );
}

// Collect every workspace package that ships a `test` script, as { name, dir }.
function listTestablePackages() {
  const bases = ['apps', 'packages', 'services'];
  const pkgs = [];
  for (const base of bases) {
    for (const entry of readdirSync(join(ROOT, base), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = join(ROOT, base, entry.name, 'package.json');
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const scripts = manifest.scripts ?? {};
      if (!scripts.test && !scripts['test:coverage']) continue;
      pkgs.push({ name: manifest.name, dir: `${base}/${entry.name}` });
    }
  }
  return pkgs;
}

function checkCiFilterReachability() {
  const ciYaml = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
  const groups = extractCiFilterGroups(ciYaml);
  return findUncoveredPackages(listTestablePackages(), groups).map(
    pkg =>
      `[ci.yml] ${pkg.name} (${pkg.dir}) ships tests but matches no CI test filter — ` +
      `it is never linted, tested or type-checked on a PR. Add it to a test job's Turbo filter.`
  );
}

// ADS-1000: a Turbo task whose script body is `tsc --noEmit` produces no
// build artefacts. Declaring dist/** outputs for it lets Turbo restore a
// stale/partial dist/ snapshot on a cache hit — silently corrupting a
// package's build (type declarations with no matching JS). Guards against
// that regression reappearing in turbo.json.
export function checkNoEmitTaskOutputs(turboConfig) {
  const failures = [];
  const tasks = turboConfig.tasks || {};
  for (const [name, bodies] of Object.entries(EXPECTED_SCRIPT_BODIES)) {
    if (!bodies.some(body => body.includes('--noEmit'))) continue;
    const task = tasks[name];
    if (!task) continue;
    const distOutputs = (task.outputs || []).filter(o => o.includes('dist/'));
    if (distOutputs.length > 0) {
      failures.push(
        `[turbo.json] '${name}' task declares dist/ output(s) (${distOutputs.join(', ')}) but its script is ` +
          `'${bodies.join(' | ')}' — --noEmit produces no build artefacts, so a cache hit restores a ` +
          `stale/partial dist/ snapshot over a real build (ADS-1000).`
      );
    }
  }
  return failures;
}

// ADS-1002: every scripts/check-*.mjs guard invoked from ci.yml's
// `workspace-drift` job — CI's required PR gate — whether as a bare
// `node scripts/check-x.mjs` step or via a wrapping `pnpm check:x` script
// that runs one, must map to a root `check:*` script that also runs locally
// via `pnpm ci:local`, so the two never drift out of parity (ci.yml
// previously called scripts/check-csp-headers.mjs and
// scripts/check-readmes.mjs directly with no ci:local equivalent). Scope is
// deliberately narrow: only steps backed by a scripts/check-*.mjs file are
// checked — a workspace-drift step with no such backing (e.g. `pnpm ls -r`,
// `pnpm format:check`, `pnpm check:proto-fresh`) is outside what this guard
// covers and won't be flagged either way.

// Extract the YAML text of a single top-level job block (from its
// `  <jobName>:` header line to the next 2-space-indented top-level key).
// Mirrors parseDevVolumesAnchor's dedent-detection style above.
export function extractJobBlock(ciYaml, jobName) {
  const lines = ciYaml.split('\n');
  const startIdx = lines.findIndex(l => l === `  ${jobName}:`);
  if (startIdx === -1) return null;
  const blockLines = [lines[startIdx]];
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^  \S/.test(lines[i])) break; // dedent to 2 spaces = next job key
    blockLines.push(lines[i]);
  }
  return blockLines.join('\n');
}

// Every scripts/check-*.mjs guard referenced in a job's YAML, whether
// invoked directly ('node scripts/check-x.mjs') or via a wrapping root
// package.json script ('pnpm check:x').
export function findGuardScriptFiles(jobYaml, rootScripts) {
  const found = new Set();
  const directRe = /\bnode scripts\/(check-[\w-]+\.mjs)\b/g;
  let m;
  while ((m = directRe.exec(jobYaml)) !== null) found.add(m[1]);

  const pnpmRe = /\bpnpm (check:[\w-]+)\b/g;
  while ((m = pnpmRe.exec(jobYaml)) !== null) {
    const body = rootScripts[m[1]] || '';
    const fileMatch = body.match(/scripts\/(check-[\w-]+\.mjs)/);
    if (fileMatch) found.add(fileMatch[1]);
  }
  return [...found].sort();
}

// The root package.json script name (if any) whose command body runs the
// given guard script file directly.
export function findRootScriptForGuardFile(file, rootScripts) {
  const hit = Object.entries(rootScripts).find(([, body]) => (body || '').includes(`scripts/${file}`));
  return hit ? hit[0] : null;
}

// Is `pnpm <scriptName>` one of the commands `ci:local` runs?
export function isRunByCiLocal(scriptName, ciLocalBody) {
  const escaped = scriptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\bpnpm ${escaped}\\b`).test(ciLocalBody || '');
}

export function checkWorkspaceDriftGuardsCoveredByCiLocal(ciYaml, rootPkg) {
  const rootScripts = rootPkg.scripts || {};
  const jobYaml = extractJobBlock(ciYaml, 'workspace-drift');
  if (!jobYaml) {
    return [
      "[ci.yml] could not find the 'workspace-drift' job — expected a top-level '  workspace-drift:' key (ADS-1002).",
    ];
  }

  const failures = [];
  const ciLocalBody = rootScripts['ci:local'] || '';
  for (const file of findGuardScriptFiles(jobYaml, rootScripts)) {
    const scriptName = findRootScriptForGuardFile(file, rootScripts);
    if (!scriptName) {
      failures.push(
        `[ci.yml workspace-drift] invokes scripts/${file} but no root package.json script wraps it — ` +
          `add a 'check:*' script for it (ADS-1002).`
      );
      continue;
    }
    if (!isRunByCiLocal(scriptName, ciLocalBody)) {
      failures.push(
        `[ci.yml workspace-drift] scripts/${file} runs via the '${scriptName}' root script, but 'ci:local' ` +
          `does not run '${scriptName}' — add it to ci:local so local parity matches CI (ADS-1002).`
      );
    }
  }
  return failures;
}

function main() {
  const libs = listLibs();
  const apps = listApps();
  const services = listServices();
  const packages = listAllPackages();
  const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const turboConfig = JSON.parse(readFileSync(join(ROOT, 'turbo.json'), 'utf8'));

  const failures = [];
  const warnings = [];

  // 1. Required scripts
  for (const lib of libs) {
    const { scripts, missing } = checkRequiredScripts(lib, REQUIRED_LIB_SCRIPTS);
    if (missing.length > 0) {
      failures.push(`[${lib}] missing scripts: ${missing.join(', ')}`);
    }
    warnings.push(...checkScriptBodyDrift(lib, scripts));
    failures.push(...checkLibFormatBodies(lib, scripts));
  }
  for (const app of apps) {
    const { scripts, missing } = checkRequiredScripts(app, REQUIRED_APP_SCRIPTS);
    if (missing.length > 0) {
      failures.push(`[${app}] missing scripts: ${missing.join(', ')}`);
    }
    warnings.push(...checkScriptBodyDrift(app, scripts));
  }

  // 2. vitest workspace
  const missingVitest = checkVitestWorkspace(libs);
  for (const lib of missingVitest) {
    failures.push(
      `[vitest.workspace.ts] missing entry: 'packages/${lib}/vitest.config.ts' (lib has a vitest.config.ts on disk but is not listed)`
    );
  }

  // 3. vite alias map
  const missingAliases = checkViteAliases(libs);
  for (const lib of missingAliases) {
    failures.push(
      `[vite.shared.config.ts] getLibraryAliases() missing entry for '@adopt-dont-shop/${lib}'`
    );
  }

  // 3b. ADS-762: app vitest.config.ts must not hand-roll lib aliases
  const appAliasOffenders = checkAppVitestAliases(apps);
  for (const { app, libs: handRolled } of appAliasOffenders) {
    failures.push(
      `[${pkgDir(app)}/vitest.config.ts] hand-rolled @adopt-dont-shop alias(es): ${handRolled.join(', ')}. ` +
        `Use getLibraryAliases(__dirname, 'development') from vite.shared.config.ts instead (ADS-762).`
    );
  }

  // 3c. ADS-765: @types/* belongs in devDependencies
  const typesOffenders = checkTypesInDependencies([...libs, ...apps]);
  for (const { workspace, types } of typesOffenders) {
    failures.push(
      `[${pkgDir(workspace)}/package.json] @types/* in 'dependencies': ${types.join(', ')}. ` +
        `Move to devDependencies — type-only packages must not be runtime deps (ADS-765).`
    );
  }

  // 3d. ADS-764: happy-dom must not re-appear (jsdom is canonical)
  const domOffenders = checkBannedDomEnv([...libs, ...apps]);
  for (const ws of domOffenders) {
    failures.push(
      `[${pkgDir(ws)}/package.json] declares 'happy-dom'. ` +
        `jsdom is the canonical test-DOM environment — remove happy-dom (ADS-764).`
    );
  }

  // 4. Nested lockfiles
  const nested = findNestedLockfiles();
  for (const file of nested) {
    failures.push(`[lockfiles] unexpected nested lockfile: ${file}`);
  }

  // 5. Stale Jest references
  const jestRefs = findJestReferences();
  for (const file of jestRefs) {
    failures.push(`[jest-refs] stale 'jest' reference in tracked file: ${file}`);
  }

  // 6. Test files outside src/ (ADS-737)
  const strayTests = findStrayTests([...libs, ...apps]);
  for (const file of strayTests) {
    failures.push(
      `[test-layout] test file outside src/: ${file} — move tests under src/ (co-located for React libs/apps, src/__tests__/ for backend/non-UI libs). See CONTRIBUTING.md "Test layout".`
    );
  }

  // 7. Service instrumentation — every service must ship src/instrumentation.ts
  //    and preload it via --import in dev and start scripts (ADS-981)
  failures.push(...checkServiceInstrumentation(services));

  // 8. Hoisted devDependencies must not reappear in lib.* packages (ADS-730)
  const HOISTED_DEVDEPS = [
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    'eslint',
    'eslint-config-prettier',
    'eslint-plugin-prettier',
    'prettier',
    'typescript',
    'vitest',
    '@vitest/coverage-v8',
    'typescript-eslint',
  ];
  for (const lib of libs) {
    const pkg = readPkg(lib);
    const devDeps = pkg?.devDependencies ?? {};
    const reintroduced = HOISTED_DEVDEPS.filter(dep => dep in devDeps);
    if (reintroduced.length > 0) {
      failures.push(
        `[${lib}] re-introduces hoisted devDependencies: ${reintroduced.join(', ')} (declare them only in the root package.json — see ADS-730)`
      );
    }
  }

  // 9. docker-compose.dev.yml's x-dev-volumes anchor must mount node_modules
  //    for every current app/e2e/package/service workspace (ADS-987)
  failures.push(...checkDevVolumesDrift(apps, packages, services));

  // 10. scripts/templates/**/package.json must not drift from the workspace
  //     root's pinned versions for cross-cutting deps (ADS-980)
  failures.push(...checkTemplateDepsDrift(rootPkg));

  // 11. .tool-versions must agree with .nvmrc / package.json packageManager
  //     (ADS-943)
  failures.push(...checkToolVersions(rootPkg));

  // 12. Every service vitest.config.ts must import the shared helper (ADS-985)
  failures.push(...checkServiceVitestConfig(services));

  // 13. No --noEmit task may declare dist/ outputs in turbo.json (ADS-1000)
  failures.push(...checkNoEmitTaskOutputs(turboConfig));

  // 14. Every services/* and packages/lib.* must declare its own coverage
  //     thresholds (ADS-1004)
  failures.push(...checkCoverageThresholds(libs, services));

  // ADS-1029: every testable package must be reachable by a CI test filter.
  failures.push(...checkCiFilterReachability());

  // 14. services/*, e2e and every non-lib.* packages/* must ship
  //     lint/format/format:check too — libs/apps already require them via
  //     REQUIRED_LIB_SCRIPTS / REQUIRED_APP_SCRIPTS (ADS-1003), and the
  //     non-lib shared packages (eslint-config-*, db, authz, …) are now in
  //     scope so their source can't silently escape `pnpm lint` /
  //     `pnpm format:check` (ADS-1062).
  const nonLibPackageDirs = packages
    .filter(name => !name.startsWith('lib.'))
    .map(name => `packages/${name}`);
  for (const dir of [...services.map(svc => `services/${svc}`), ...nonLibPackageDirs, 'e2e']) {
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'));
    } catch {
      // Every entry here comes from a real services/* directory (listServices())
      // or the known e2e workspace, so a missing/unreadable package.json is
      // itself drift worth failing on, not something to skip past.
      failures.push(`[${dir}] package.json missing or unreadable (ADS-1003)`);
      continue;
    }
    failures.push(...checkLintFormatScripts(dir, pkg.scripts || {}));
  }

  // ADS-1002: every ci.yml workspace-drift guard must be wrapped in a root
  // 'check:*' script that ci:local also runs.
  const ciYaml = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
  failures.push(...checkWorkspaceDriftGuardsCoveredByCiLocal(ciYaml, rootPkg));

  if (warnings.length > 0) {
    console.warn('Warnings (non-fatal — script body drift):');
    for (const w of warnings) {
      console.warn(
        `  - [${w.workspace}] '${w.script}' body is '${w.actual}', expected one of: ${w.expected.join(' | ')}`
      );
    }
    console.warn('');
  }

  if (failures.length === 0) {
    console.log('OK — workspace consistency checks passed.');
    return;
  }

  console.error('Workspace consistency check failed:');
  for (const f of failures) console.error(`  - ${f}`);
  console.error('');
  console.error('Fix each finding above. Required scripts must exist verbatim in the');
  console.error("package's `scripts` block; alias/workspace entries must be added by hand.");
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
