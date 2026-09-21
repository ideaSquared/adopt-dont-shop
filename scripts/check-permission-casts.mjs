#!/usr/bin/env node
/**
 * Permission-cast guard (ADS-1340).
 *
 * `const X: Permission = 'literal' as Permission;` silences the `Permission`
 * union check: the cast accepts ANY string, typo included, so a misspelled
 * or unregistered permission compiles clean and `hasPermission`/
 * `requirePermission` then silently 403 every non-super_admin caller (see
 * services/auth/src/migrations/rbac-seed-handler-parity.test.ts for the
 * historical fallout this caused — ADS-1235/ADS-1304). Permission constants
 * belong in @adopt-dont-shop/lib.types
 * (packages/lib.types/src/types/rescue-permissions.ts) and should be
 * imported, never re-declared with an assertion.
 *
 * This guard scans every committed services/*\/src/grpc/**\/*.ts file for
 * that cast pattern and fails if it finds one. Test files are excluded —
 * they build ad-hoc mock principals (`permissions: ['x.y' as Permission]`),
 * a different, legitimate use of the assertion that this guard does not
 * police.
 *
 * Dependency-free (no node_modules required to run it), mirroring the other
 * scripts/check-*.mjs guards.
 *
 * Run via `node scripts/check-permission-casts.mjs` or
 * `pnpm check:permission-casts` (wired into `ci:local`).
 */
import { readdirSync, readFileSync } from 'fs';
import { join, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SERVICES_DIR = join(ROOT, 'services');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', 'coverage']);
const TEST_FILE_RE = /\.test\.ts$/;

// A quoted permission literal cast straight to `Permission`. Mirrors the
// pattern services/auth/src/migrations/rbac-seed-handler-parity.test.ts
// already scans for — deliberately narrower than "any `as Permission`", so
// it does not flag casting a dynamic value (e.g. a DB row's string column)
// or an array-type assertion (`[] as Permission[]`), neither of which is
// the "re-declared constant" problem this guard polices.
const AS_PERMISSION_RE = /(['"])([-\w.:]+)\1\s+as\s+Permission\b/;
// A real permission literal is `resource.action[.action...][:any]`, all
// lowercase segments — excludes comment prose that happens to match the raw
// cast regex above (e.g. this file's own header, or rbac-seed-handler-
// parity.test.ts's, which quote the `'...' as Permission` pattern as an
// example: `...` alone would otherwise match `[-\w.:]+`).
const PERMISSION_LIKE_PATTERN = /^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)+(:any)?$/;

/**
 * Recursively list every `*.ts` file under a `services/**\/grpc/**` path,
 * excluding test files, as paths relative to `root`.
 *
 * @param {string} root
 * @returns {string[]}
 */
export function findGrpcFiles(root) {
  const files = [];
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const relPath = relative(root, full);
      const inGrpcDir = relPath.split(sep).includes('grpc');
      if (entry.name.endsWith('.ts') && !TEST_FILE_RE.test(entry.name) && inGrpcDir) {
        files.push(relPath);
      }
    }
  }
  walk(root);
  return files.sort();
}

/**
 * Find `'literal' as Permission` casts in a file's source text.
 *
 * @param {string} content
 * @returns {number[]} 1-based line numbers of each offending line.
 */
export function findPermissionCasts(content) {
  return content
    .split('\n')
    .map((text, index) => {
      const match = text.match(AS_PERMISSION_RE);
      return match && PERMISSION_LIKE_PATTERN.test(match[2]) ? index + 1 : -1;
    })
    .filter(line => line !== -1);
}

/**
 * Scan every services/**\/grpc/**\/*.ts file (excluding tests) under `root`
 * for committed `as Permission` casts.
 *
 * @param {string} root
 * @returns {{ file: string, line: number }[]}
 */
export function scanPermissionCasts(root) {
  return findGrpcFiles(root).flatMap(file =>
    findPermissionCasts(readFileSync(join(root, file), 'utf8')).map(line => ({ file, line }))
  );
}

function main() {
  const offenders = scanPermissionCasts(SERVICES_DIR);

  if (offenders.length > 0) {
    console.error('Committed `as Permission` cast(s) detected in services/**/grpc/**:');
    for (const { file, line } of offenders) {
      console.error(`  - services/${file}:${line}`);
    }
    console.error('');
    console.error(
      "A `'...' as Permission` cast silences the Permission union check, so a " +
        'misspelled or unregistered permission compiles clean and silently never ' +
        'matches a grant (ADS-1340). Import the real constant from ' +
        '@adopt-dont-shop/lib.types (packages/lib.types/src/types/rescue-permissions.ts) ' +
        'instead — add it there first if it does not exist yet.'
    );
    process.exit(1);
  }

  console.log('OK — no `as Permission` casts found in services/**/grpc/**.');
}

// Only run when executed directly (`node scripts/check-permission-casts.mjs`),
// not when imported by the test file.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
