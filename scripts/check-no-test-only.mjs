#!/usr/bin/env node
/**
 * Committed focused-test guard (ADS-1049).
 *
 * A focused test — Vitest/Jest `describe.only` / `it.only` / `test.only`
 * (or `.only` chained on any suite/test fn), or the Jasmine-style `fdescribe`
 * / `fit` — silently disables every sibling test in its file and still passes
 * CI. Playwright is already protected by `forbidOnly: CI`; nothing guarded the
 * Vitest side, so a stray `.only` accidentally committed would quietly shrink
 * the suite. This guard scans every committed test file
 * (`**\/*.{test,spec}.{ts,tsx}`) and fails if it finds a focus marker.
 *
 * Dependency-free (no node_modules) so it runs in the workspace-drift job and
 * before `pnpm install`, mirroring the other scripts/check-*.mjs guards.
 *
 * Run via `node scripts/check-no-test-only.mjs` or `pnpm check:no-only`
 * (wired into `ci:local`).
 */
import { readdirSync, readFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', 'coverage']);

// `.only` used as a member-access qualifier: `describe.only`, `it.only`,
// `test.only`, `bench.only`, `it.only.each(...)`, `.only(...)`. The trailing
// `\b` keeps `readonly` / `.onlyChild` from matching (those have no `.only`
// boundary), while the leading identifier (when present) gives a readable
// marker like `it.only`.
const ONLY_PREFIXED_RE = /\b(\w+)\s*\.\s*only\b/;
const ONLY_BARE_RE = /\.only\b/;
// Jasmine-style focused calls: `fdescribe(...)`, `fit(...)`. The `(` keeps
// prose ("benefit(", a `fit` variable) from matching.
const FOCUSED_FN_RE = /\bf(describe|it)\s*\(/;

/**
 * Find focused-test markers in a file's source text.
 *
 * @param {string} content
 * @returns {{ line: number, marker: string }[]} One entry per offending line,
 *   with a human-readable marker (`it.only`, `fdescribe`, ...).
 */
export function findFocusedTests(content) {
  return content.split('\n').flatMap((text, index) => {
    const line = index + 1;
    const found = [];

    const prefixed = text.match(ONLY_PREFIXED_RE);
    if (prefixed) {
      found.push({ line, marker: `${prefixed[1]}.only` });
    } else if (ONLY_BARE_RE.test(text)) {
      found.push({ line, marker: '.only' });
    }

    const focusedFn = text.match(FOCUSED_FN_RE);
    if (focusedFn) {
      found.push({ line, marker: `f${focusedFn[1]}` });
    }

    return found;
  });
}

/**
 * Recursively list every `*.{test,spec}.{ts,tsx}` file under `root`, as paths
 * relative to `root`, skipping build/vcs directories.
 *
 * @param {string} root
 * @returns {string[]}
 */
export function findTestFiles(root) {
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (TEST_FILE_RE.test(entry.name)) {
        files.push(relative(root, full));
      }
    }
  }
  walk(root);
  return files.sort();
}

/**
 * Scan every test file under `root` for committed focused tests.
 *
 * @param {string} root
 * @returns {{ file: string, line: number, marker: string }[]}
 */
export function scanFocusedTests(root) {
  return findTestFiles(root).flatMap(file =>
    findFocusedTests(readFileSync(join(root, file), 'utf8')).map(({ line, marker }) => ({
      file,
      line,
      marker,
    }))
  );
}

function main() {
  const failures = scanFocusedTests(ROOT);

  if (failures.length === 0) {
    console.log('OK — no committed focused tests (.only / fdescribe / fit) found.');
    return;
  }

  console.error('Committed focused test(s) detected:');
  for (const { file, line, marker } of failures) {
    console.error(`  - ${file}:${line} — ${marker}`);
  }
  console.error('');
  console.error(
    'A focused test silently skips every sibling test in its file yet still passes CI.'
  );
  console.error('Remove the focus marker (.only / fdescribe / fit) before committing.');
  process.exit(1);
}

// Only run when executed directly (`node scripts/check-no-test-only.mjs`),
// not when imported by the test file.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
