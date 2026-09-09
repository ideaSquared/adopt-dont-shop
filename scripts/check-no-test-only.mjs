#!/usr/bin/env node
/**
 * Committed focused-test guard (ADS-1049, extended ADS-1327).
 *
 * A focused test — Vitest/Jest `describe.only` / `it.only` / `test.only`
 * (or `.only` chained on any suite/test fn), or the Jasmine-style `fdescribe`
 * / `fit` — silently disables every sibling test in its file and still passes
 * CI. Playwright is already protected by `forbidOnly: CI`; nothing guarded the
 * Vitest side, so a stray `.only` accidentally committed would quietly shrink
 * the suite. This guard scans every committed test file
 * (`**\/*.{test,spec}.{ts,tsx}`) and fails if it finds a focus marker.
 *
 * ADS-1327: a *skipped* test (`.skip`, `.todo`, `.skipIf`, `.fixme`) has the
 * same "silently shrinks the suite" shape as `.only` but is more often
 * intentional (e.g. an env-gated integration test skipped when a dependency
 * like `DATABASE_URL` isn't configured — see the packages/events and
 * services/auth `*.integration.test.ts` suites added in ADS-1315). So these
 * markers are reported as warnings by default — visible, not silently
 * invisible — and only fail the run with `--strict`. CI does not currently
 * pass `--strict` (see ci.yml's "Verify no committed focused tests" step):
 * this same repo state legitimately carries `describe.skipIf` for those
 * DB-gated integration suites, so a hard fail would block exactly the
 * pattern the guard should allow. `--strict` is available for local/manual
 * use once a skip-usage inventory or allowlist makes it safe to enforce.
 *
 * Dependency-free (no node_modules required to run it), mirroring the other
 * scripts/check-*.mjs guards.
 *
 * Run via `node scripts/check-no-test-only.mjs` (add `--strict` to also fail
 * on skip markers) or `pnpm check:no-only` (wired into `ci:local` and the
 * workspace-drift job in ci.yml).
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

// ADS-1327: skip-shaped markers — `describe.skip`, `it.todo`, `test.skipIf`,
// `it.fixme`, etc. Same member-access shape as ONLY_PREFIXED_RE above, so the
// same `\b` boundary keeps lookalikes (`skipped`, `.skipToNext`) from
// matching (the regex requires the literal marker word, not a prefix of it).
const SKIP_MARKER_NAMES = ['skip', 'todo', 'skipIf', 'fixme'];
const SKIP_PREFIXED_RE = new RegExp(`\\b(\\w+)\\s*\\.\\s*(${SKIP_MARKER_NAMES.join('|')})\\b`);

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
 * Find skip-shaped markers (`.skip`, `.todo`, `.skipIf`, `.fixme`) in a
 * file's source text. See the ADS-1327 module comment above for why these
 * are warnings, not hard failures, by default.
 *
 * @param {string} content
 * @returns {{ line: number, marker: string }[]}
 */
export function findSkippedTests(content) {
  return content.split('\n').flatMap((text, index) => {
    const line = index + 1;
    const match = text.match(SKIP_PREFIXED_RE);
    if (!match) return [];
    return [{ line, marker: `${match[1]}.${match[2]}` }];
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

/**
 * Scan every test file under `root` for committed skip-shaped markers.
 *
 * @param {string} root
 * @returns {{ file: string, line: number, marker: string }[]}
 */
export function scanSkippedTests(root) {
  return findTestFiles(root).flatMap(file =>
    findSkippedTests(readFileSync(join(root, file), 'utf8')).map(({ line, marker }) => ({
      file,
      line,
      marker,
    }))
  );
}

/**
 * Evaluate the guard's pass/fail outcome for `root` — pure and exported so
 * `--strict` behaviour is unit-testable without spawning a process.
 *
 * @param {string} root
 * @param {{ strict?: boolean }} [options]
 * @returns {{
 *   focusFailures: { file: string, line: number, marker: string }[],
 *   skipWarnings: { file: string, line: number, marker: string }[],
 *   shouldFail: boolean,
 * }}
 */
export function evaluateTestFiles(root, { strict = false } = {}) {
  const focusFailures = scanFocusedTests(root);
  const skipWarnings = scanSkippedTests(root);
  const shouldFail = focusFailures.length > 0 || (strict && skipWarnings.length > 0);
  return { focusFailures, skipWarnings, shouldFail };
}

function main() {
  const strict = process.argv.includes('--strict');
  const { focusFailures, skipWarnings, shouldFail } = evaluateTestFiles(ROOT, { strict });

  if (focusFailures.length > 0) {
    console.error('Committed focused test(s) detected:');
    for (const { file, line, marker } of focusFailures) {
      console.error(`  - ${file}:${line} — ${marker}`);
    }
    console.error('');
    console.error(
      'A focused test silently skips every sibling test in its file yet still passes CI.'
    );
    console.error('Remove the focus marker (.only / fdescribe / fit) before committing.');
  }

  if (skipWarnings.length > 0) {
    const logFn = strict ? console.error : console.warn;
    logFn(`${strict ? 'Committed' : 'Warning: committed'} skipped test(s) detected:`);
    for (const { file, line, marker } of skipWarnings) {
      logFn(`  - ${file}:${line} — ${marker}`);
    }
    logFn('');
    logFn(
      'A skipped test silently shrinks the suite. This is often intentional (an env-gated ' +
        'integration test), but double-check it was not left skipped by accident.' +
        (strict ? ' Failing because --strict was passed.' : '')
    );
  }

  if (!shouldFail) {
    console.log(
      focusFailures.length === 0 && skipWarnings.length === 0
        ? 'OK — no committed focused or skipped tests found.'
        : 'OK — no committed focused tests found (skip warnings above did not fail the run).'
    );
    return;
  }

  process.exit(1);
}

// Only run when executed directly (`node scripts/check-no-test-only.mjs`),
// not when imported by the test file.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
