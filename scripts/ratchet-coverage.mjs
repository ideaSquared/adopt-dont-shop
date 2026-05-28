#!/usr/bin/env node
/**
 * Ratchets backend coverage thresholds upward when actual coverage exceeds
 * them by a comfortable margin (ADS-717).
 *
 * Policy:
 *   - Reads service.backend/coverage/coverage-summary.json (written by
 *     vitest's `json-summary` reporter when `npm run test:coverage` runs).
 *   - Compares totals to the thresholds in service.backend/vitest.config.ts.
 *   - For each metric (lines, statements, functions, branches): if
 *     actual > threshold + 2, bump threshold to floor(actual - 1).
 *     The +2 margin avoids flapping on noisy v8 measurements; the -1 keeps
 *     a small buffer so a one-line change can't immediately re-fail CI.
 *   - Thresholds are only ever raised, never lowered.
 *   - Exits 0 even when nothing changes — this is a maintenance script,
 *     not a gate.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUMMARY_PATH = join(ROOT, 'service.backend', 'coverage', 'coverage-summary.json');
const CONFIG_PATH = join(ROOT, 'service.backend', 'vitest.config.ts');

const METRICS = ['lines', 'statements', 'functions', 'branches'];
const MARGIN = 2;
const HEADROOM = 1;

function readSummary() {
  if (!existsSync(SUMMARY_PATH)) {
    console.error(`No coverage summary at ${SUMMARY_PATH}.`);
    console.error('Run `npm run test:coverage --workspace=@adopt-dont-shop/service-backend` first.');
    process.exit(0);
  }
  const raw = JSON.parse(readFileSync(SUMMARY_PATH, 'utf8'));
  if (!raw.total) {
    console.error('coverage-summary.json missing `total` block.');
    process.exit(0);
  }
  return raw.total;
}

function readConfig() {
  return readFileSync(CONFIG_PATH, 'utf8');
}

function parseThresholdBlock(source) {
  // Matches the `thresholds: { lines: N, statements: N, functions: N, branches: N }`
  // block (whitespace and trailing commas tolerated). Captures the inner body so
  // we can rewrite only the metric lines and leave the surrounding formatting alone.
  const match = source.match(/(thresholds\s*:\s*\{)([\s\S]*?)(\n\s*\},?)/);
  if (!match) {
    console.error('Could not locate `thresholds: { ... }` block in vitest.config.ts.');
    process.exit(0);
  }
  const [full, open, body, close] = match;
  const current = {};
  for (const metric of METRICS) {
    const m = body.match(new RegExp(`${metric}\\s*:\\s*(\\d+(?:\\.\\d+)?)`));
    if (!m) {
      console.error(`Could not find current threshold for ${metric}.`);
      process.exit(0);
    }
    current[metric] = Number(m[1]);
  }
  return { match: full, open, body, close, current };
}

function computeUpdates(current, total) {
  const updates = {};
  for (const metric of METRICS) {
    const actual = total[metric]?.pct;
    if (typeof actual !== 'number') continue;
    const next = Math.floor(actual - HEADROOM);
    if (actual > current[metric] + MARGIN && next > current[metric]) {
      updates[metric] = { from: current[metric], to: next, actual };
    }
  }
  return updates;
}

function applyUpdates(block, updates) {
  let body = block.body;
  for (const [metric, { to }] of Object.entries(updates)) {
    body = body.replace(
      new RegExp(`(${metric}\\s*:\\s*)\\d+(?:\\.\\d+)?`),
      `$1${to}`
    );
  }
  return block.open + body + block.close;
}

function main() {
  const total = readSummary();
  const source = readConfig();
  const block = parseThresholdBlock(source);
  const updates = computeUpdates(block.current, total);

  if (Object.keys(updates).length === 0) {
    console.log('Coverage ratchet: no thresholds needed bumping.');
    for (const metric of METRICS) {
      const actual = total[metric]?.pct;
      console.log(`  ${metric}: actual=${actual?.toFixed(2) ?? '?'}% threshold=${block.current[metric]}%`);
    }
    return;
  }

  const newBlock = applyUpdates(block, updates);
  const nextSource = source.replace(block.match, newBlock);
  writeFileSync(CONFIG_PATH, nextSource);

  console.log('Coverage ratchet: raised thresholds in service.backend/vitest.config.ts');
  for (const [metric, { from, to, actual }] of Object.entries(updates)) {
    console.log(`  ${metric}: ${from} -> ${to} (actual ${actual.toFixed(2)}%)`);
  }
}

main();
