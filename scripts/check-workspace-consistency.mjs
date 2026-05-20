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
 *  4. No nested package-lock.json outside the repo root.
 *  5. No stale Jest references in source (excluding docs/ and *.md changelog files).
 *
 * Common script bodies (lint = 'eslint .'|'eslint src', type-check =
 * 'tsc --noEmit', test = 'vitest run') drift produces a warning, not failure.
 *
 * Mirrors the pattern of scripts/check-lib-tests.mjs.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
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

const EXPECTED_LINT_BODIES = ['eslint .', 'eslint src'];

function listWorkspaces(prefix) {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith(prefix))
    .map(e => e.name)
    .sort();
}

function readPkg(workspace) {
  const path = join(ROOT, workspace, 'package.json');
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

function checkVitestWorkspace(libs) {
  const path = join(ROOT, 'vitest.workspace.ts');
  const contents = readFileSync(path, 'utf8');
  const missing = libs.filter(lib => {
    try {
      statSync(join(ROOT, lib, 'vitest.config.ts'));
    } catch {
      return false;
    }
    return !contents.includes(`${lib}/vitest.config.ts`);
  });
  return missing;
}

function checkViteAliases(libs) {
  const path = join(ROOT, 'vite.shared.config.ts');
  const contents = readFileSync(path, 'utf8');
  return libs.filter(lib => !contents.includes(`'@adopt-dont-shop/${lib}'`));
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
      if (entry.name === 'package-lock.json' && dir !== ROOT) {
        found.push(relative(ROOT, full));
      }
    }
  }
  walk(ROOT);
  return found;
}

// This script must not flag itself: it intentionally names the runner it
// guards against, in comments and string constants.
const JEST_REF_FILE_ALLOWLIST = new Set(['scripts/check-workspace-consistency.mjs']);

function findJestReferences() {
  // Walk tracked, source-relevant files for the stale runner name.
  // We avoid spawning git so the script is runnable on any checkout.
  const matches = [];
  function shouldSkip(name) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') return true;
    if (name === 'docs') return true;
    if (name.endsWith('.md')) return true;
    if (name === 'package-lock.json') return true;
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
      // Only inspect text-y source files
      if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|yml|yaml)$/.test(entry.name)) continue;
      const rel = relative(ROOT, full);
      if (JEST_REF_FILE_ALLOWLIST.has(rel)) continue;
      const contents = readFileSync(full, 'utf8');
      if (/jest/i.test(contents)) {
        matches.push(rel);
      }
    }
  }
  walk(ROOT);
  return matches;
}

function main() {
  const libs = listWorkspaces('lib.');
  const apps = listWorkspaces('app.');

  const failures = [];
  const warnings = [];

  // 1. Required scripts
  for (const lib of libs) {
    const { scripts, missing } = checkRequiredScripts(lib, REQUIRED_LIB_SCRIPTS);
    if (missing.length > 0) {
      failures.push(`[${lib}] missing scripts: ${missing.join(', ')}`);
    }
    warnings.push(...checkScriptBodyDrift(lib, scripts));
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
      `[vitest.workspace.ts] missing entry: '${lib}/vitest.config.ts' (lib has a vitest.config.ts on disk but is not listed)`,
    );
  }

  // 3. vite alias map
  const missingAliases = checkViteAliases(libs);
  for (const lib of missingAliases) {
    failures.push(
      `[vite.shared.config.ts] getLibraryAliases() missing entry for '@adopt-dont-shop/${lib}'`,
    );
  }

  // 4. Nested lockfiles
  const nested = findNestedLockfiles();
  for (const file of nested) {
    failures.push(`[lockfiles] unexpected nested package-lock.json: ${file}`);
  }

  // 5. Stale Jest references
  const jestRefs = findJestReferences();
  for (const file of jestRefs) {
    failures.push(`[jest-refs] stale 'jest' reference in tracked file: ${file}`);
  }

  if (warnings.length > 0) {
    console.warn('Warnings (non-fatal — script body drift):');
    for (const w of warnings) {
      console.warn(
        `  - [${w.workspace}] '${w.script}' body is '${w.actual}', expected one of: ${w.expected.join(' | ')}`,
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
