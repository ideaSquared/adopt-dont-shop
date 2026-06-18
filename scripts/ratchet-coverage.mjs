#!/usr/bin/env node
/**
 * Coverage threshold ratchet (ADS-796 / ADS-717).
 *
 * Reads a v8 `coverage-summary.json` (emit it with the vitest `json-summary`
 * reporter) and a persisted `coverage-thresholds.json`, raises each persisted
 * threshold towards the freshly measured coverage (minus a safety margin), and
 * writes the updated thresholds back. Thresholds are NEVER lowered, so a
 * coverage regression keeps CI red.
 *
 * `vitest.shared.config.ts` reads `coverage-thresholds.json` when it exists and
 * falls back to the legacy 0% baseline when it does not — so adding this file
 * is what actually moves enforcement off 0%. See docs/testing.md for rollout.
 *
 * Usage:
 *   node scripts/ratchet-coverage.mjs [options]
 *
 * Options:
 *   --summary <path>     Coverage summary JSON (default: coverage/coverage-summary.json)
 *   --thresholds <path>  Persisted thresholds JSON (default: coverage-thresholds.json)
 *   --margin <number>    Safety margin subtracted from measured % (default: 1)
 *   --dry-run            Print the result without writing the thresholds file
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

import { measuredFromSummaryTotal, ratchetThresholds } from './lib/ratchet-coverage-core.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { dryRun: false, margin: 1 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg === '--summary') {
      args.summary = argv[(i += 1)];
      continue;
    }
    if (arg === '--thresholds') {
      args.thresholds = argv[(i += 1)];
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
  const summaryPath = resolve(ROOT, args.summary ?? 'coverage/coverage-summary.json');
  const thresholdsPath = resolve(ROOT, args.thresholds ?? 'coverage-thresholds.json');

  if (!existsSync(summaryPath)) {
    console.error(`No coverage summary found at ${summaryPath}.`);
    console.error('Run coverage with the vitest "json-summary" reporter first.');
    process.exit(1);
  }

  const summary = readJson(summaryPath);
  const measured = measuredFromSummaryTotal(summary.total ?? {});
  const current = existsSync(thresholdsPath) ? readJson(thresholdsPath) : {};

  const next = ratchetThresholds(current, measured, args.margin);

  const changed = JSON.stringify(current) !== JSON.stringify(next);
  console.log('Coverage ratchet:');
  console.log(`  measured:  ${JSON.stringify(measured)}`);
  console.log(`  thresholds: ${JSON.stringify(next)}`);

  if (!changed) {
    console.log('No change — thresholds already at or above measured coverage.');
    return;
  }

  if (args.dryRun) {
    console.log('(dry run — not written)');
    return;
  }

  writeFileSync(thresholdsPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Wrote ${thresholdsPath}`);
}

main();
