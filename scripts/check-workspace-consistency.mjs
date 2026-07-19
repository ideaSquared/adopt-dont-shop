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
 *
 * Common script bodies (lint = 'eslint .'|'eslint src', type-check =
 * 'tsc --noEmit', test = 'vitest run') drift produces a warning, not failure.
 *
 * Mirrors the pattern of scripts/check-lib-tests.mjs.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

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

function main() {
  const libs = listLibs();
  const apps = listApps();
  const services = listServices();
  const packages = listAllPackages();

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

main();
