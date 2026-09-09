#!/usr/bin/env node
/**
 * Bundle size budget guard (ADS-1327).
 *
 * There was no bundle size budget at all — a dependency bump or an
 * accidentally-eager import could silently double an app's shipped JS with
 * nothing catching it. This is deliberately CI-agnostic (a plain Node
 * script reading `dist/`, no service dependency) so it runs the same
 * locally and in CI: `pnpm build:apps && pnpm check:bundle-size`.
 *
 * What it measures: total bytes of every `.js` (excluding `.map`) and
 * `.css` file under each app's `dist/`, summed — not gzip, and not
 * per-chunk (Vite's own `chunkSizeWarningLimit`, set in each app's
 * vite.config.ts, already warns on an individual chunk exceeding 500 KB;
 * this guards the shipped total instead). Budgets below are the measured
 * total per app (`pnpm build:apps`, 2026-09-07) plus a ~20% margin —
 * raise a budget deliberately when a real feature grows the bundle, the
 * same way scripts/ratchet-coverage.mjs treats a coverage floor: intentional
 * moves up, never silently.
 *
 * Usage:
 *   pnpm build:apps && pnpm check:bundle-size
 */
import { readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Measured 2026-09-07 (pnpm build:apps): client 2,138,906 B, admin
// 2,491,847 B, rescue 1,834,826 B. Budgets below are +~20% margin.
export const BUNDLE_BUDGETS_BYTES = {
  'app.client': 2_500_000,
  'app.admin': 2_950_000,
  'app.rescue': 2_150_000,
};

/**
 * Sums the byte size of every non-map .js and every .css file under a
 * directory, recursively.
 * @param {string} dir
 * @returns {number}
 */
export function computeDistSize(dir) {
  let total = 0;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return total;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      total += computeDistSize(full);
      continue;
    }
    const ext = extname(entry.name);
    if (ext === '.map') continue;
    if (ext !== '.js' && ext !== '.css') continue;
    total += statSync(full).size;
  }
  return total;
}

/**
 * @param {Record<string, number>} sizes app name -> measured bytes
 * @param {Record<string, number>} budgets app name -> budget bytes
 * @returns {{ app: string, size: number, budget: number }[]} the apps over budget
 */
export function findOverBudget(sizes, budgets) {
  return Object.entries(budgets)
    .filter(([app]) => app in sizes)
    .filter(([app, budget]) => sizes[app] > budget)
    .map(([app, budget]) => ({ app, size: sizes[app], budget }));
}

function formatBytes(bytes) {
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

function main() {
  /** @type {Record<string, number>} */
  const sizes = {};
  const missing = [];
  for (const app of Object.keys(BUNDLE_BUDGETS_BYTES)) {
    const distDir = join(ROOT, 'apps', app.replace('app.', ''), 'dist');
    const size = computeDistSize(distDir);
    if (size === 0) {
      missing.push(app);
      continue;
    }
    sizes[app] = size;
  }

  if (missing.length > 0) {
    console.error(
      `check:bundle-size: no dist/ output found for ${missing.join(', ')}. Run "pnpm build:apps" first.`
    );
    process.exit(1);
  }

  for (const [app, size] of Object.entries(sizes)) {
    console.log(`${app}: ${formatBytes(size)} / ${formatBytes(BUNDLE_BUDGETS_BYTES[app])} budget`);
  }

  const overBudget = findOverBudget(sizes, BUNDLE_BUDGETS_BYTES);
  if (overBudget.length > 0) {
    console.error('\nBundle size budget exceeded:');
    for (const { app, size, budget } of overBudget) {
      console.error(`  ${app}: ${formatBytes(size)} > ${formatBytes(budget)} budget`);
    }
    console.error(
      '\nIf this growth is expected, raise the budget in scripts/check-bundle-size.mjs deliberately.'
    );
    process.exit(1);
  }

  console.log('\nAll apps within their bundle size budget.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
