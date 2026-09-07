#!/usr/bin/env node
/**
 * Migration expand/contract back-compat lint (ADS-1325, ADR 0008).
 *
 * ADR 0008 adopts expand/contract as policy: a migration must leave the
 * schema readable and writable by the code that is *currently deployed*, so
 * old and new replicas coexist during rollout and an image-only rollback
 * stays a real recovery path. This script is the enforcement half of that
 * decision — it scans migration files newly added on this branch (relative
 * to `origin/main`) for contracting operations and fails the check unless
 * the file carries an explicit marker comment saying the break is either
 * intentional-and-staged or has been signed off:
 *
 *   // backcompat: expand-phase-of ADS-1234
 *   // backcompat: contract-approved ADS-1234
 *
 * Flagged operations:
 *   - dropColumn / dropColumns
 *   - dropTable
 *   - renameColumn
 *   - renameTable
 *   - a NOT NULL added via addColumn/addColumns/alterColumn with no `default`
 *     (this fails on a populated table but not on a fresh one — see the
 *     "run twice, then against a seeded DB" step in schema-equivalence.yml)
 *   - alterColumn changing a column's `type` (a possible narrowing; we can't
 *     tell widen from narrow statically, so any type change on an existing
 *     column needs the same explicit marker)
 *
 * `createTable` is exempt from the NOT-NULL check — a table just created in
 * the same migration has no rows yet, so NOT NULL without a default is safe.
 *
 * Only a migration's `up` function is scanned. `down` is never run
 * automatically (there is no `db:migrate:undo` — see
 * docs/backend/writing-migrations.md), so a `down` that drops the table /
 * columns its own `up` just created — the shape of nearly every migration in
 * this repo — is not a production risk and must not be flagged.
 *
 * Run via `node scripts/check-migration-backcompat.mjs` or
 * `pnpm check:migration-backcompat` (wired into `ci:local` and
 * `schema-equivalence.yml`). `--list [--service <name>] [--base <ref>]`
 * prints the added migration file paths one per line (used by the CI step
 * that replays new migrations against a seeded database) instead of linting.
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const MIGRATION_FILE_PATTERN = /^services\/[^/]+\/src\/migrations\/\d{3}_[a-z0-9_]+\.ts$/;

const CONTRACTING_CALL_OPS = [
  'dropColumn',
  'dropColumns',
  'dropTable',
  'renameColumn',
  'renameTable',
];
const NOT_NULL_CALL_OPS = ['addColumn', 'addColumns', 'alterColumn'];
const CALL_PATTERN = new RegExp(
  `pgm\\.(${[...CONTRACTING_CALL_OPS, ...NOT_NULL_CALL_OPS].join('|')})\\s*\\(`,
  'g'
);

const BACKCOMPAT_MARKER_PATTERN =
  /\/\/\s*backcompat:\s*(expand-phase-of|contract-approved)\s+ADS-\d+/;

// Index of the `(` right after `pgm.<op>` -> index of its matching `)`,
// naive depth counting (no string-literal awareness, matching the simplicity
// of the other scripts/check-*.mjs guards in this repo).
export function findMatchingParen(text, openParenIndex) {
  let depth = 0;
  for (let i = openParenIndex; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// The innermost {...} span enclosing a given position — e.g. for a
// `notNull: true` match inside `addColumns('t', { col: { ...here... } })`,
// this returns the single column's own object literal, not the outer map.
export function findEnclosingBraceSpan(text, pos) {
  let depth = 0;
  let start = -1;
  for (let i = pos; i >= 0; i--) {
    if (text[i] === '}') depth++;
    else if (text[i] === '{') {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start === -1) return null;

  depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return [start, i];
    }
  }
  return null;
}

// For a column-definition object like `favourite_colour: { ... }`, returns
// "favourite_colour" given the index of its opening brace — best-effort, used
// only to make the lint's failure message readable.
function findPrecedingKey(text, braceStart) {
  const before = text.slice(Math.max(0, braceStart - 80), braceStart);
  const match = before.match(/(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1\s*:\s*$/);
  return match ? match[2] : null;
}

// Matches the `{` that opens the `up` function's body, e.g.
// `export const up = async (pgm: MigrationBuilder): Promise<void> => {`.
const UP_FUNCTION_START_PATTERN = /export\s+const\s+up\s*=\s*async[^{]*\{/;

// Returns just the `up` function's body text (braces included), or the
// whole file if the pattern isn't found — fail-safe, since scanning too
// much (down included) is a false positive, not a missed real one.
function extractUpFunctionBody(text) {
  const match = text.match(UP_FUNCTION_START_PATTERN);
  if (!match) return text;
  const braceStart = match.index + match[0].length - 1;
  const braceEnd = findMatchingBrace(text, braceStart);
  if (braceEnd === -1) return text;
  return text.slice(match.index, braceEnd + 1);
}

// Index of a `{` -> index of its matching `}`, naive depth counting.
export function findMatchingBrace(text, openBraceIndex) {
  let depth = 0;
  for (let i = openBraceIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findCallSpans(text) {
  const spans = [];
  for (const match of text.matchAll(CALL_PATTERN)) {
    const openParenIndex = match.index + match[0].length - 1;
    const closeParenIndex = findMatchingParen(text, openParenIndex);
    if (closeParenIndex === -1) continue; // malformed — ignore, not our job to parse TS
    spans.push({ op: match[1], start: match.index, end: closeParenIndex });
  }
  return spans;
}

// Returns the list of contracting-operation violations found in a migration
// file's source text. Each violation is { op, detail }.
export function findContractingOperations(fileText) {
  const text = extractUpFunctionBody(fileText);
  const violations = [];
  const callSpans = findCallSpans(text);

  for (const call of callSpans) {
    if (CONTRACTING_CALL_OPS.includes(call.op)) {
      violations.push({ op: call.op, detail: `pgm.${call.op}(...)` });
    }
    if (call.op === 'alterColumn') {
      const argsText = text.slice(call.start, call.end + 1);
      if (/\btype\s*:/.test(argsText)) {
        violations.push({ op: 'alterColumn-type-change', detail: argsText.split('\n')[0] });
      }
    }
  }

  const notNullOpSpans = callSpans.filter(c => NOT_NULL_CALL_OPS.includes(c.op));
  for (const match of text.matchAll(/notNull\s*:\s*true/g)) {
    const pos = match.index;
    const insideRelevantCall = notNullOpSpans.some(c => pos >= c.start && pos <= c.end);
    if (!insideRelevantCall) continue; // e.g. inside createTable — new table, no rows yet

    const span = findEnclosingBraceSpan(text, pos);
    const objectText = span ? text.slice(span[0], span[1] + 1) : match[0];
    if (!/\bdefault\s*:/.test(objectText)) {
      const columnName = span ? findPrecedingKey(text, span[0]) : null;
      const detail = objectText.replace(/\s+/g, ' ');
      violations.push({
        op: 'not-null-without-default',
        detail: columnName ? `${columnName}: ${detail}` : detail,
      });
    }
  }

  return violations;
}

export function hasBackcompatMarker(text) {
  return BACKCOMPAT_MARKER_PATTERN.test(text);
}

// Lints one migration file's source text. `ok` is true when there are no
// contracting operations, or when there are but the file carries the
// explicit marker comment.
export function checkMigrationText(file, text) {
  const violations = findContractingOperations(text);
  const markerPresent = hasBackcompatMarker(text);
  return {
    file,
    violations,
    ok: violations.length === 0 || markerPresent,
  };
}

function resolveBaseRef() {
  for (const ref of ['origin/main', 'main']) {
    try {
      execFileSync('git', ['rev-parse', '--verify', ref], { cwd: ROOT, stdio: 'pipe' });
      return ref;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

// New (added, not modified/renamed) migration files on this branch relative
// to `base`, restricted to the numbered-migration filename convention.
export function getAddedMigrationFiles(base) {
  let output;
  try {
    output = execFileSync(
      'git',
      [
        'diff',
        '--name-only',
        '--diff-filter=A',
        `${base}...HEAD`,
        '--',
        'services/*/src/migrations/*.ts',
      ],
      { cwd: ROOT, encoding: 'utf8' }
    );
  } catch {
    return [];
  }
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(line => MIGRATION_FILE_PATTERN.test(line));
}

function runList(args) {
  const baseFlagIndex = args.indexOf('--base');
  const base = baseFlagIndex !== -1 ? args[baseFlagIndex + 1] : resolveBaseRef();
  const serviceFlagIndex = args.indexOf('--service');
  const service = serviceFlagIndex !== -1 ? args[serviceFlagIndex + 1] : null;

  if (!base) {
    console.error('check-migration-backcompat: could not resolve a base ref (origin/main or main)');
    process.exit(1);
  }

  const files = getAddedMigrationFiles(base).filter(
    f => !service || f.startsWith(`services/${service}/src/migrations/`)
  );
  files.forEach(f => console.log(f));
}

function runLint() {
  const base = resolveBaseRef();
  if (!base) {
    console.warn(
      'check-migration-backcompat: could not resolve origin/main or main — skipping (nothing to diff against locally).'
    );
    return;
  }

  const addedFiles = getAddedMigrationFiles(base);
  if (addedFiles.length === 0) {
    console.log(`OK — no new migration files added relative to ${base}.`);
    return;
  }

  const results = addedFiles.map(file =>
    checkMigrationText(file, readFileSync(join(ROOT, file), 'utf8'))
  );
  const failures = results.filter(r => !r.ok);

  if (failures.length === 0) {
    console.log(
      `OK — ${addedFiles.length} new migration(s) relative to ${base} contain no unmarked contracting operations.`
    );
    return;
  }

  console.error('Migration back-compat check failed (ADR 0008):');
  for (const result of failures) {
    console.error(`\n  ${result.file}`);
    for (const violation of result.violations) {
      console.error(`    - ${violation.op}: ${violation.detail}`);
    }
  }
  console.error(
    '\nA contracting migration (drop/rename, or a NOT NULL added without a default, or a\n' +
      "possible type narrowing) needs an explicit marker comment saying it's a deliberate,\n" +
      'staged expand-phase change or an approved contract:\n' +
      '\n  // backcompat: expand-phase-of ADS-NNN\n  // backcompat: contract-approved ADS-NNN\n'
  );
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--list') {
    runList(args);
    return;
  }
  runLint();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
