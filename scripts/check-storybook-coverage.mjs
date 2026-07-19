#!/usr/bin/env node
/**
 * Storybook stories-coverage report + ratchet (ADS-956).
 *
 * `packages/lib.components/src/components/ui/` has ~30 UI components but
 * only a handful of `*.stories.tsx` files, which erodes trust in the
 * published Storybook catalogue. This script:
 *
 *   - Walks the ui/ directory and finds every component, whether it lives
 *     as a flat file (`Button.tsx`) or in its own directory
 *     (`DateTime/DateTime.tsx`), excluding `.test.tsx`, `.stories.tsx`, and
 *     `.css.ts` files.
 *   - Reports which components are missing a matching `*.stories.tsx`.
 *   - Prints a coverage percentage.
 *
 * Two modes, mirroring scripts/ratchet-coverage.mjs:
 *
 *   node scripts/check-storybook-coverage.mjs            # report + gate
 *   node scripts/check-storybook-coverage.mjs --ratchet   # raise the floor
 *
 * The "check" mode (default, `pnpm check:stories`) prints the report and
 * fails only if coverage has regressed below the persisted floor in
 * `stories-coverage-threshold.json`. Regression is the only failure mode —
 * a missing threshold file means no floor has been set yet, so the check
 * always passes (matching the coverage-ratchet rollout story).
 *
 * The "ratchet" mode raises the persisted floor towards current coverage
 * (never lowers it) and writes the file back, for a maintainer to commit
 * once new stories land.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UI_DIR = join(ROOT, 'packages/lib.components/src/components/ui');
const THRESHOLD_PATH = join(ROOT, 'stories-coverage-threshold.json');

// --- Discovery -------------------------------------------------------------

/**
 * @param {string} uiDir
 * @returns {{ name: string, hasStories: boolean }[]}
 */
export function discoverComponents(uiDir) {
  const components = [];
  for (const entry of readdirSync(uiDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const dirFiles = readdirSync(join(uiDir, entry.name));
      const hasComponent = dirFiles.includes(`${entry.name}.tsx`);
      if (!hasComponent) continue;
      components.push({
        name: entry.name,
        hasStories: dirFiles.includes(`${entry.name}.stories.tsx`),
      });
      continue;
    }
    if (!entry.name.endsWith('.tsx')) continue;
    if (entry.name.endsWith('.test.tsx') || entry.name.endsWith('.stories.tsx')) continue;
    const name = entry.name.replace(/\.tsx$/, '');
    const siblingFiles = readdirSync(uiDir);
    components.push({ name, hasStories: siblingFiles.includes(`${name}.stories.tsx`) });
  }
  return components.sort((a, b) => a.name.localeCompare(b.name));
}

// --- Coverage ---------------------------------------------------------------

/**
 * @param {{ name: string, hasStories: boolean }[]} components
 */
export function computeCoverage(components) {
  const total = components.length;
  const withStories = components.filter(c => c.hasStories).length;
  const missing = components.filter(c => !c.hasStories).map(c => c.name);
  const percentage = total === 0 ? 100 : (withStories / total) * 100;
  return { total, withStories, missing, percentage };
}

// --- Ratchet (one-directional floor, mirrors ratchet-coverage-core.mjs) ------

/**
 * @param {number} currentFloor
 * @param {number} measuredPercentage
 * @param {number} margin
 */
export function ratchetFloor(currentFloor, measuredPercentage, margin = 0) {
  const target = Math.max(0, Math.floor(measuredPercentage - margin));
  return target <= currentFloor ? currentFloor : target;
}

// --- Report -------------------------------------------------------------

export function formatReport({ total, withStories, missing, percentage }) {
  const lines = [
    '# Storybook stories coverage',
    '',
    `**Coverage: ${percentage.toFixed(1)}%** (${withStories}/${total} components have a \`*.stories.tsx\`)`,
    '',
  ];
  if (missing.length === 0) {
    lines.push('Every UI component has a stories file.');
  } else {
    lines.push('Components missing a `*.stories.tsx`:');
    lines.push('');
    for (const name of missing) lines.push(`- ${name}`);
  }
  lines.push('');
  return lines.join('\n');
}

// --- CLI -----------------------------------------------------------------

function readThreshold() {
  if (!existsSync(THRESHOLD_PATH)) return null;
  return JSON.parse(readFileSync(THRESHOLD_PATH, 'utf8'));
}

function main() {
  const ratchet = process.argv.includes('--ratchet');

  const components = discoverComponents(UI_DIR);
  const coverage = computeCoverage(components);
  const report = formatReport(coverage);
  console.log(report);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, `${report}\n`);
  }

  if (ratchet) {
    const current = readThreshold();
    const currentFloor = current?.floor ?? 0;
    const nextFloor = ratchetFloor(currentFloor, coverage.percentage);
    console.log(`Ratchet: floor ${currentFloor}% -> ${nextFloor}%`);
    if (nextFloor === currentFloor) {
      console.log('No change — floor already at or above measured coverage.');
      return;
    }
    writeFileSync(THRESHOLD_PATH, `${JSON.stringify({ floor: nextFloor }, null, 2)}\n`);
    console.log(`Wrote ${THRESHOLD_PATH}`);
    return;
  }

  const threshold = readThreshold();
  if (threshold && coverage.percentage < threshold.floor) {
    console.error(
      `Stories coverage regressed: ${coverage.percentage.toFixed(1)}% is below the persisted floor of ${threshold.floor}%.`
    );
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
