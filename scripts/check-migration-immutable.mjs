#!/usr/bin/env node
/**
 * Shipped-migration immutability guard (VPS-23).
 *
 * A migration that has reached main has run against real databases, so editing,
 * deleting or renaming it makes a fresh database diverge from a migrated one. The
 * fix is always a new numbered migration. This script lists the numbered migration
 * files that a branch modifies, deletes or renames relative to origin/main (new
 * files are fine) and fails when there are any.
 */
import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { MIGRATION_FILE_PATTERN } from './check-migration-backcompat.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Takes `git diff --name-status` output; returns the pre-existing numbered migration
// paths it modifies, deletes or renames away from.
export function findChangedShippedMigrations(nameStatusOutput) {
  return nameStatusOutput
    .split('\n')
    .map(line => line.split('\t'))
    .filter(([status]) => /^[MDR]/.test(status ?? ''))
    .map(([, oldPath]) => oldPath)
    .filter(path => MIGRATION_FILE_PATTERN.test(path ?? ''));
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

function main() {
  const base = resolveBaseRef();
  if (!base) {
    console.warn(
      'check-migration-immutable: could not resolve origin/main or main — skipping (nothing to diff against locally).'
    );
    return;
  }

  const output = execFileSync(
    'git',
    ['diff', '--name-status', '-M', '--diff-filter=MDR', `${base}...HEAD`, '--', 'services'],
    { cwd: ROOT, encoding: 'utf8' }
  );
  const changed = findChangedShippedMigrations(output);

  if (changed.length === 0) {
    console.log(`OK — no existing migration was modified, deleted or renamed relative to ${base}.`);
    return;
  }

  console.error(
    `check-migration-immutable: ${changed.length} shipped migration(s) changed relative to ${base}:`
  );
  changed.forEach(file => console.error(`  - ${file}`));
  console.error('Never edit a shipped migration; add a new NNN_snake_case.ts file instead.');
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
