// Smoke tests for the pnpm new-app / new-lib generators (ADS-994).
//
// Runs the REAL generator scripts into a throwaway temp root (via the
// ADS_GENERATOR_ROOT override) and asserts the generated package lands at the
// correct pnpm-workspace location with a convention-matching package name —
// the two things that were broken (output at repo root + npm-style
// "workspaces" registration). Deps are never installed (the app generator
// doesn't, and the lib generator is run with --skip-install), so these stay
// hermetic and fast.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isWorkspaceCovered } from './lib/template-engine.mjs';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));

const WORKSPACE_MANIFEST = [
  'packages:',
  "  - 'apps/*'",
  "  - 'packages/*'",
  "  - 'services/*'",
  "  - 'e2e'",
  '',
].join('\n');

let root;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ads-gen-'));
  // The generators resolve their output base from ADS_GENERATOR_ROOT and read
  // pnpm-workspace.yaml from it, so seed a realistic manifest.
  writeFileSync(join(root, 'pnpm-workspace.yaml'), WORKSPACE_MANIFEST);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const runGenerator = (script, args) =>
  execFileSync('node', [join(SCRIPTS_DIR, script), ...args], {
    env: { ...process.env, ADS_GENERATOR_ROOT: root },
    encoding: 'utf8',
  });

describe('pnpm new-app (create-new-app.js)', () => {
  it('generates the app under apps/<slug> with the @adopt-dont-shop/app.<slug> name', () => {
    runGenerator('create-new-app.js', ['app.dashboard', '--template', 'minimal']);

    const pkgPath = join(root, 'apps', 'dashboard', 'package.json');
    expect(existsSync(pkgPath)).toBe(true);
    // NOT at the old broken location (repo root / app.dashboard).
    expect(existsSync(join(root, 'app.dashboard'))).toBe(false);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    expect(pkg.name).toBe('@adopt-dont-shop/app.dashboard');
  });

  it('leaves pnpm-workspace.yaml unchanged (apps/* already covers the new app)', () => {
    const before = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
    runGenerator('create-new-app.js', ['app.portal', '--template', 'minimal']);
    expect(readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8')).toBe(before);
  });
});

describe('pnpm new-lib (create-new-lib.js)', () => {
  it('generates the lib under packages/lib.<name> with the @adopt-dont-shop/lib.<name> name', () => {
    runGenerator('create-new-lib.js', [
      'widgets',
      'Widget helpers',
      '--type=utility',
      '--skip-install',
    ]);

    const pkgPath = join(root, 'packages', 'lib.widgets', 'package.json');
    expect(existsSync(pkgPath)).toBe(true);
    expect(existsSync(join(root, 'lib.widgets'))).toBe(false);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    expect(pkg.name).toBe('@adopt-dont-shop/lib.widgets');
  });

  it('does not add npm-style per-lib scripts to a root package.json', () => {
    // The old generator mutated a package.json "workspaces" array + added
    // dev:lib-*/build:lib-*/test:lib-* scripts. Nothing should touch a root
    // package.json now (there isn't even one in the temp root).
    runGenerator('create-new-lib.js', ['gadgets', '--type=utility', '--skip-install']);
    expect(existsSync(join(root, 'package.json'))).toBe(false);
  });
});

describe('isWorkspaceCovered', () => {
  it('recognises a package already covered by a parent glob', () => {
    expect(isWorkspaceCovered(WORKSPACE_MANIFEST, 'apps/dashboard')).toBe(true);
    expect(isWorkspaceCovered(WORKSPACE_MANIFEST, 'packages/lib.widgets')).toBe(true);
    expect(isWorkspaceCovered(WORKSPACE_MANIFEST, 'e2e')).toBe(true);
  });

  it('reports an uncovered top-level location', () => {
    expect(isWorkspaceCovered(WORKSPACE_MANIFEST, 'tools/foo')).toBe(false);
  });
});
