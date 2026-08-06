#!/usr/bin/env node
/**
 * Form-primitives debt ratchet (ADS-1075).
 *
 * Forms in the apps should be built from `FormField` + `Input` (+ Zod schemas),
 * not raw `<input>/<select>/<textarea>` elements or the deprecated `TextInput`
 * component. Those raw controls usually miss the label / `aria-describedby` /
 * error wiring that `FormField` provides, so they are both a consistency and an
 * accessibility debt.
 *
 * This script counts the raw controls + `TextInput` usages across the apps and,
 * in the default (check) mode, fails only if the count has RISEN above the
 * persisted ceiling in `form-primitives-threshold.json`. Regression (new debt)
 * is the only failure mode — a missing threshold file means no ceiling is set
 * yet, so the check passes. This mirrors `scripts/check-storybook-coverage.mjs`,
 * but ratchets a debt count DOWN instead of a coverage percentage up.
 *
 *   node scripts/check-form-primitives.mjs            # report + gate
 *   node scripts/check-form-primitives.mjs --ratchet   # lower the ceiling
 *
 * The "ratchet" mode lowers the persisted ceiling towards the current count
 * (never raises it) and writes the file back, for a maintainer to commit once
 * forms are migrated off raw controls.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIRS = ['apps/admin/src', 'apps/client/src', 'apps/rescue/src'];
const THRESHOLD_PATH = join(ROOT, 'form-primitives-threshold.json');

// Raw HTML form controls (lower-case tag → not the shared `<Input>`/`<TextArea>`)
// and the deprecated `TextInput` component. Case-sensitive on purpose.
const RAW_ELEMENT_RE = /<(input|select|textarea)(\s|>|\/)/g;
const TEXTINPUT_RE = /<TextInput(\s|>|\/)/g;

// --- Discovery -------------------------------------------------------------

/**
 * Recursively list `.tsx` files under `dir`, excluding tests, stories, and
 * build/dependency output.
 * @param {string} dir
 * @returns {string[]}
 */
export function listTsxFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = current => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.tsx')) continue;
      if (entry.name.endsWith('.test.tsx') || entry.name.endsWith('.stories.tsx')) continue;
      out.push(full);
    }
  };
  walk(dir);
  return out;
}

// --- Counting --------------------------------------------------------------

/**
 * Count raw form controls + `TextInput` usages in a single source string.
 * @param {string} source
 * @returns {number}
 */
export function countInSource(source) {
  const raw = source.match(RAW_ELEMENT_RE)?.length ?? 0;
  const textInput = source.match(TEXTINPUT_RE)?.length ?? 0;
  return raw + textInput;
}

/**
 * @param {string} root
 * @param {string[]} appDirs
 * @returns {{ total: number, byApp: Record<string, number> }}
 */
export function countForApps(root, appDirs) {
  const byApp = {};
  let total = 0;
  for (const rel of appDirs) {
    let sub = 0;
    for (const file of listTsxFiles(join(root, rel))) {
      sub += countInSource(readFileSync(file, 'utf8'));
    }
    byApp[rel] = sub;
    total += sub;
  }
  return { total, byApp };
}

// --- Ratchet (one-directional ceiling, mirrors check-storybook-coverage) ----

/**
 * @param {number} currentCeiling
 * @param {number} measured
 * @returns {number}
 */
export function ratchetCeiling(currentCeiling, measured) {
  return measured < currentCeiling ? measured : currentCeiling;
}

// --- Report ----------------------------------------------------------------

export function formatReport(total, byApp) {
  const lines = [
    '# Form-primitives debt',
    '',
    `**Raw \`<input>/<select>/<textarea>\` + \`TextInput\` usages in apps: ${total}**`,
    '',
  ];
  for (const [rel, count] of Object.entries(byApp)) lines.push(`- ${rel}: ${count}`);
  lines.push('');
  lines.push('Target: build forms from `FormField` + `Input` (+ Zod). See the `forms` skill.');
  lines.push('');
  return lines.join('\n');
}

// --- CLI -------------------------------------------------------------------

function readThreshold() {
  if (!existsSync(THRESHOLD_PATH)) return null;
  return JSON.parse(readFileSync(THRESHOLD_PATH, 'utf8'));
}

function main() {
  const ratchet = process.argv.includes('--ratchet');

  const { total, byApp } = countForApps(ROOT, APP_DIRS);
  const report = formatReport(total, byApp);
  console.log(report);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) appendFileSync(summaryPath, `${report}\n`);

  if (ratchet) {
    const current = readThreshold();
    const currentCeiling = current?.ceiling ?? total;
    const nextCeiling = ratchetCeiling(currentCeiling, total);
    console.log(`Ratchet: ceiling ${currentCeiling} -> ${nextCeiling}`);
    if (nextCeiling === currentCeiling) {
      console.log('No change — ceiling already at or below the measured count.');
      return;
    }
    writeFileSync(THRESHOLD_PATH, `${JSON.stringify({ ceiling: nextCeiling }, null, 2)}\n`);
    console.log(`Wrote ${THRESHOLD_PATH}`);
    return;
  }

  const threshold = readThreshold();
  if (threshold && total > threshold.ceiling) {
    console.error(
      `Form-primitives debt increased: ${total} raw form controls / TextInput usages exceed the ceiling of ${threshold.ceiling}. ` +
        'Build new forms from FormField + Input (+ Zod) instead — see the `forms` skill.'
    );
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
