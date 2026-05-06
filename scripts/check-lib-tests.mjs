#!/usr/bin/env node
/**
 * Fails CI when a lib.* package has zero test files. This is the safety net
 * that ADS-328 / ADS-186 ask for: prevents a regression where a package gets
 * shipped without any behaviour coverage and hides behind --passWithNoTests
 * or a missing test runner invocation.
 *
 * Allowlist below is the explicit list of packages that have not yet had
 * their baseline suite written. Adding a package here is a deliberate,
 * reviewable act — removing one is the goal.
 */
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ALLOWED_EMPTY = new Set([
  // Add a package id here only if it genuinely has no testable surface.
  // This list MUST shrink over time, not grow.
  //
  // 'lib.dev-tools' — baseline suite added in PR #293 (group F). Remove
  // this entry after that PR merges. Keeping it here so this Group D PR
  // can land independently of Group F.
  'lib.dev-tools',
]);

function findTestFiles(dir) {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += findTestFiles(full);
    } else if (/\.(test|spec)\.tsx?$/.test(entry.name)) {
      count += 1;
    }
  }
  return count;
}

function main() {
  const failures = [];
  for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('lib.')) continue;
    const pkgRoot = join(ROOT, entry.name);
    const srcDir = join(pkgRoot, 'src');
    try {
      statSync(srcDir);
    } catch {
      continue;
    }
    if (ALLOWED_EMPTY.has(entry.name)) continue;
    const count = findTestFiles(srcDir);
    if (count === 0) {
      failures.push(entry.name);
    }
  }

  if (failures.length === 0) {
    console.log('OK — every lib.* package has at least one test file.');
    return;
  }

  console.error('The following lib.* packages have ZERO test files:');
  for (const f of failures) console.error(`  - ${f}`);
  console.error('');
  console.error('Either add a behaviour test or, if there is genuinely nothing to test,');
  console.error('add the package id to ALLOWED_EMPTY in scripts/check-lib-tests.mjs with');
  console.error('a justification in the PR description.');
  process.exit(1);
}

main();
