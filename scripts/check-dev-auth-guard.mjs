#!/usr/bin/env node
/**
 * Dev-auth bypass guard (ADS-676, extracted from `.github/actions/dev-auth-guard`
 * to a script in ADS-1327 so `pnpm ci:local` can run the same check CI does).
 *
 * Verifies that dev-auth bypass patterns (`dev_user` / `dev-token-`) only
 * appear inside `import.meta.env.DEV` guards (which Vite replaces with
 * `false` and tree-shakes in production builds). Fails if either pattern
 * appears in production source (every app's src dir, every lib.* package's
 * src dir) outside the allowed DEV-gated locations:
 *   - packages/lib.auth/src/contexts/AuthContext.tsx — DEV-gated
 *   - apps/<name>/src/components/dev/ (any file)      — dev panels
 *   - apps/<name>/src/utils/devAuth.ts                — dev utilities
 *   - apps/<name>/src/contexts/base/devUtils.ts       — dev utilities
 *   - any .test. / .spec. file                        — test files
 *
 * Dependency-free (no node_modules required to run it), mirroring the other
 * scripts/check-*.mjs guards. `.github/actions/dev-auth-guard/action.yml`
 * calls this same script so the composite-action and `ci:local` checks can
 * never drift apart.
 *
 * Run via `node scripts/check-dev-auth-guard.mjs` or `pnpm check:dev-auth-guard`
 * (wired into `ci:local`).
 */
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const BYPASS_PATTERN = /dev_user|dev-token-/;
const TEST_FILE_RE = /\.(test|spec)\./;
const SOURCE_FILE_RE = /\.(ts|tsx)$/;

// A relative path containing any of these substrings is an allowed,
// DEV-gated location — mirrors the original `grep -v` exclusions.
const ALLOWED_SUBSTRINGS = [
  '/components/dev/',
  '/utils/devAuth',
  '/contexts/base/devUtils',
  'AuthContext.tsx',
];

function listSubdirs(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch {
    return [];
  }
}

function findSourceFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findSourceFiles(full, out);
      continue;
    }
    if (SOURCE_FILE_RE.test(entry.name) && !TEST_FILE_RE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// The two globs the original guard scanned: apps/*/src and packages/lib.*/src.
function scanTargets(root) {
  const appsDir = join(root, 'apps');
  const packagesDir = join(root, 'packages');
  return [
    ...listSubdirs(appsDir).map(name => join(appsDir, name, 'src')),
    ...listSubdirs(packagesDir)
      .filter(name => name.startsWith('lib.'))
      .map(name => join(packagesDir, name, 'src')),
  ];
}

/**
 * Scan the repo for ungated dev-auth bypass patterns.
 *
 * @param {string} [root]
 * @returns {{ file: string, line: number, text: string }[]}
 */
export function findDevAuthHits(root = ROOT) {
  const hits = [];
  for (const dir of scanTargets(root)) {
    for (const file of findSourceFiles(dir)) {
      const relPath = file.slice(root.length + 1);
      if (ALLOWED_SUBSTRINGS.some(s => relPath.includes(s))) {
        continue;
      }
      const content = readFileSync(file, 'utf8');
      content.split('\n').forEach((text, index) => {
        if (BYPASS_PATTERN.test(text)) {
          hits.push({ file: relPath, line: index + 1, text: text.trim() });
        }
      });
    }
  }
  return hits;
}

function main() {
  const hits = findDevAuthHits();

  if (hits.length === 0) {
    console.log('OK — all dev auth patterns are properly gated.');
    return;
  }

  console.error('ERROR: Dev auth bypass patterns found outside allowed locations:');
  for (const { file, line, text } of hits) {
    console.error(`  ${file}:${line}:${text}`);
  }
  console.error('');
  console.error('dev_user / dev-token- must only appear in:');
  console.error('  - packages/lib.auth/src/contexts/AuthContext.tsx (DEV-gated)');
  console.error('  - apps/*/src/components/dev/* (dev-only panels)');
  console.error('  - apps/*/src/utils/devAuth.ts (dev-only utilities)');
  console.error('  - Test files (*.test.*, *.spec.*)');
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
