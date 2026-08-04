#!/usr/bin/env node
/**
 * Coverage threshold ratchet (ADS-796 / ADS-1004).
 *
 * Reads a package's v8 `coverage-summary.json` (emit it with the vitest
 * `json-summary` reporter) and the coverage thresholds already declared in
 * that package's own `vitest.config.ts`, raises each threshold towards the
 * freshly measured coverage (minus a safety margin), and rewrites the
 * thresholds back into that same `vitest.config.ts`. Thresholds are NEVER
 * lowered, so a coverage regression keeps CI red.
 *
 * ADS-1004: each `services/*` / `packages/lib.*` package's `vitest.config.ts`
 * is the single source of truth for its own coverage floor — there is no
 * persisted root thresholds file. See CONTRIBUTING.md "Coverage thresholds"
 * and docs/testing.md for the mechanism this ratchets.
 *
 * Usage:
 *   node scripts/ratchet-coverage.mjs --package <path> [options]
 *
 * Options:
 *   --package <path>     Package directory relative to the repo root
 *                         (required), e.g. packages/lib.api or services/chat.
 *   --summary <path>     Coverage summary JSON, relative to --package
 *                         (default: coverage/coverage-summary.json)
 *   --margin <number>    Safety margin subtracted from measured % (default: 1)
 *   --dry-run            Print the result without writing vitest.config.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

import {
  extractThresholdsFromSource,
  measuredFromSummaryTotal,
  ratchetThresholds,
  updateThresholdsInSource,
} from './lib/ratchet-coverage-core.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { dryRun: false, margin: 1 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg === '--package') {
      args.package = argv[(i += 1)];
      continue;
    }
    if (arg === '--summary') {
      args.summary = argv[(i += 1)];
      continue;
    }
    if (arg === '--margin') {
      args.margin = Number(argv[(i += 1)]);
      continue;
    }
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.package) {
    console.error(
      'Usage: node scripts/ratchet-coverage.mjs --package <path> [--summary <path>] [--margin <n>] [--dry-run]'
    );
    console.error('Example: node scripts/ratchet-coverage.mjs --package packages/lib.api');
    process.exit(1);
  }

  const packageDir = resolve(ROOT, args.package);
  const summaryPath = resolve(packageDir, args.summary ?? 'coverage/coverage-summary.json');
  const configPath = join(packageDir, 'vitest.config.ts');

  if (!existsSync(summaryPath)) {
    console.error(`No coverage summary found at ${summaryPath}.`);
    console.error('Run "test:coverage" for this package with the vitest "json-summary" reporter first.');
    process.exit(1);
  }

  if (!existsSync(configPath)) {
    console.error(`No vitest.config.ts found at ${configPath}.`);
    process.exit(1);
  }

  const summary = readJson(summaryPath);
  const measured = measuredFromSummaryTotal(summary.total ?? {});
  const source = readFileSync(configPath, 'utf8');
  const current = extractThresholdsFromSource(source);

  if (Object.keys(current).length === 0) {
    console.error(`No coverage thresholds declared in ${configPath}.`);
    console.error(
      'The ratchet only raises an existing floor — add an initial `thresholds` block ' +
        '(see CONTRIBUTING.md "Coverage thresholds") before ratcheting.'
    );
    process.exit(1);
  }

  const next = ratchetThresholds(current, measured, args.margin);

  const changed = JSON.stringify(current) !== JSON.stringify(next);
  console.log('Coverage ratchet:');
  console.log(`  package:    ${args.package}`);
  console.log(`  measured:   ${JSON.stringify(measured)}`);
  console.log(`  thresholds: ${JSON.stringify(next)}`);

  if (!changed) {
    console.log('No change — thresholds already at or above measured coverage.');
    return;
  }

  if (args.dryRun) {
    console.log('(dry run — not written)');
    return;
  }

  writeFileSync(configPath, updateThresholdsInSource(source, next));
  console.log(`Updated ${configPath}`);
}

main();
