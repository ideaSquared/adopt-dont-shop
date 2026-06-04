#!/usr/bin/env node
/**
 * ADS-702: Fails CI when a new migration is added under a numeric prefix
 * that is already used by another migration.
 *
 * umzug tracks migrations by their full filename and executes them in
 * alphabetical order, so duplicate prefixes are not a correctness bug
 * today — but they communicate no ordering intent and a new `09-foo.ts`
 * could accidentally sort before a dependency. This guard prevents that
 * regression without renumbering migrations that have already run in
 * production.
 *
 * Existing duplicates are explicitly allowlisted below. Do NOT extend
 * the allowlist for new migrations — pick the next free prefix instead.
 */
import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(ROOT, 'service.backend/src/migrations');

// Frozen as of ADS-702. Each entry is the set of filenames that share
// the prefix. CI fails if any *new* filename is added under one of these
// prefixes, or if any other prefix grows beyond one filename.
const EXISTING_DUPLICATES = new Map([
  [
    '05',
    new Set(['05-add-user-tokens-invalid-before.ts', '05-create-two-factor-recoveries.ts']),
  ],
  [
    '08',
    new Set([
      '08-add-moderator-actions-acknowledged-at.ts',
      '08-add-notification-c4-enum-values.ts',
      '08-create-application-drafts.ts',
    ]),
  ],
  [
    '09',
    new Set(['09-add-allergies-to-adopter-match-profile.ts', '09-add-chats-assigned-to.ts']),
  ],
]);

const isMigrationFile = name =>
  name.endsWith('.ts') && !name.startsWith('_') && name !== 'runner.ts';

const extractPrefix = name => {
  const match = /^(\d+)-/.exec(name);
  return match ? match[1] : null;
};

const main = () => {
  const files = readdirSync(MIGRATIONS_DIR).filter(isMigrationFile);
  const byPrefix = new Map();
  for (const file of files) {
    const prefix = extractPrefix(file);
    if (!prefix || prefix === '00') {
      // The 00-baseline-* family is intentional bulk-seeding, not a clash.
      continue;
    }
    const existing = byPrefix.get(prefix) ?? new Set();
    existing.add(file);
    byPrefix.set(prefix, existing);
  }

  const violations = [];
  for (const [prefix, group] of byPrefix) {
    if (group.size <= 1) {
      continue;
    }
    const allowed = EXISTING_DUPLICATES.get(prefix);
    if (!allowed) {
      violations.push(
        `Prefix ${prefix} is shared by ${group.size} migrations but is not allowlisted:\n` +
          [...group].sort().map(f => `  - ${f}`).join('\n')
      );
      continue;
    }
    const extras = [...group].filter(f => !allowed.has(f));
    if (extras.length > 0) {
      violations.push(
        `Prefix ${prefix} has new migrations added beyond the allowlist:\n` +
          extras.sort().map(f => `  - ${f}`).join('\n') +
          `\nPick the next unused prefix instead.`
      );
    }
  }

  if (violations.length > 0) {
    console.error(
      'Migration prefix guard (ADS-702) failed:\n\n' +
        violations.join('\n\n') +
        '\n\nIf the duplicate is intentional (e.g. you split a migration after the fact),\n' +
        'extend EXISTING_DUPLICATES in scripts/check-migration-prefixes.mjs.\n'
    );
    process.exit(1);
  }

  console.log(`Migration prefix guard OK (${files.length} migrations checked).`);
};

main();
