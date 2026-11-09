#!/usr/bin/env node
/**
 * Design-token debt ratchet.
 *
 * Styles in the apps are vanilla-extract `.css.ts` files and should take their
 * values from the theme tokens (`vars.*` in
 * `packages/lib.components/src/styles/theme.css.ts`), not hard-coded literals,
 * so that the light / normal / dark themes stay consistent. This script counts
 * the lines in `apps/<app>/src/**\/*.css.ts` that bypass the tokens, per
 * category, and in the default (check) mode fails (exit 1) if any category has
 * RISEN above its ceiling in `design-tokens-threshold.json`. A missing file, or
 * a category missing from it, means no ceiling is set yet, so that check passes.
 * Same model as `scripts/check-form-primitives.mjs`, with one ceiling per
 * category.
 *
 *   node scripts/check-design-tokens.mjs            # report + gate
 *   node scripts/check-design-tokens.mjs --ratchet   # lower each ceiling
 *
 * "--ratchet" lowers each ceiling to the current count (never raises it) and
 * writes the file back, for a maintainer to commit after migrating styles.
 *
 * Matching rules (line based, deliberately simple; a line counts at most once
 * per category, however many literals it holds):
 *   1. Block comments and `//` line comments are blanked out first.
 *   2. `vars.*` references and `fallbackVar(<var>, <fallback>)` calls are
 *      removed from the line, so the fallback argument is never counted.
 *   3. The remaining text is tested per category:
 *        colour        hex `#rgb` `#rgba` `#rrggbb` `#rrggbbaa`; `rgb(` `rgba(`
 *                      `hsl(` `hsla(`; the keywords `white` / `black` used as a
 *                      value on a `prop: value` line
 *        fontWeight    `fontWeight` / `font-weight` set to a 3-digit number
 *        fontSize      `fontSize` / `font-size` set to a px / rem / em value
 *        spacing       `padding*` / `margin*` / `gap` / `rowGap` / `columnGap`
 *                      whose value holds a non-zero px / rem literal
 *        borderRadius  `borderRadius` / `border-radius` whose value holds a
 *                      non-zero px / rem / em / % literal
 *        zIndex        `zIndex` / `z-index` set to a non-zero integer
 *      `0` (with or without a unit) is never counted.
 *   4. Test, story and mock files are skipped (`*.test.*`, `*.stories.*`,
 *      `__tests__`, `__mocks__`, `mocks`, `node_modules`, `dist`).
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIRS = ['apps/admin/src', 'apps/client/src', 'apps/rescue/src'];
const THRESHOLD_PATH = join(ROOT, 'design-tokens-threshold.json');

export const CATEGORIES = ['colour', 'fontWeight', 'fontSize', 'spacing', 'borderRadius', 'zIndex'];

const SKIPPED_DIRS = new Set(['node_modules', 'dist', '__tests__', '__mocks__', 'mocks']);

const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;
const COLOUR_FN_RE = /\b(?:rgba?|hsla?)\(/;
const COLOUR_KEYWORD_RE = /^[^:]*:.*(?:^|[\s'"`(,:])(?:white|black)(?=$|[\s'"`;,)])/;
const FONT_WEIGHT_RE = /font-?weight['"]?\s*:\s*['"`]?\d{3}\b/i;
const FONT_SIZE_RE = /font-?size['"]?\s*:\s*['"`]?\d*\.?\d+(?:px|rem|em)\b/i;
const SPACING_PROP_RE =
  /^\s*['"]?(?:padding|margin|gap|row-?gap|column-?gap)[\w-]*['"]?\s*:\s*(.*)$/i;
const RADIUS_PROP_RE = /^\s*['"]?border-?radius[\w-]*['"]?\s*:\s*(.*)$/i;
const Z_INDEX_RE = /z-?index['"]?\s*:\s*['"`]?-?[1-9]\d*\b/i;

const VARS_REF_RE = /\bvars(?:\.[\w$]+|\[\s*['"][^'"]+['"]\s*\])+/g;
const FALLBACK_VAR_RE = /fallbackVar\([^()]*\)/g;

// --- Discovery -------------------------------------------------------------

/**
 * Recursively list `.css.ts` files under `dir`, excluding tests, stories, mocks
 * and build/dependency output.
 * @param {string} dir
 * @returns {string[]}
 */
export function listCssTsFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const walk = current => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIPPED_DIRS.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.css.ts')) continue;
      if (/\.(test|stories)\./.test(entry.name)) continue;
      out.push(full);
    }
  };
  walk(dir);
  return out;
}

// --- Counting --------------------------------------------------------------

/**
 * Blank out block and `//` comments, keeping line breaks so line numbers hold.
 * @param {string} source
 * @returns {string}
 */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ''))
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

/**
 * Remove token references (`vars.*`) and `fallbackVar(...)` calls from a line.
 * @param {string} line
 * @returns {string}
 */
export function stripTokenRefs(line) {
  return line.replace(FALLBACK_VAR_RE, '').replace(VARS_REF_RE, '');
}

const hasNonZeroLength = (value, units) =>
  [...value.matchAll(new RegExp(`(?<![\\w.])(\\d*\\.?\\d+)(?:${units})\\b`, 'g'))].some(
    match => Number.parseFloat(match[1]) !== 0
  );

const hasNonZeroPercent = value =>
  [...value.matchAll(/(?<![\w.])(\d*\.?\d+)%/g)].some(match => Number.parseFloat(match[1]) !== 0);

/**
 * Categories a single (comment-free) line belongs to.
 * @param {string} rawLine
 * @returns {string[]}
 */
export function categoriesForLine(rawLine) {
  const line = stripTokenRefs(rawLine);
  const spacingValue = line.match(SPACING_PROP_RE)?.[1] ?? '';
  const radiusValue = line.match(RADIUS_PROP_RE)?.[1] ?? '';
  const checks = {
    colour: HEX_RE.test(line) || COLOUR_FN_RE.test(line) || COLOUR_KEYWORD_RE.test(line),
    fontWeight: FONT_WEIGHT_RE.test(line),
    fontSize: FONT_SIZE_RE.test(line) && hasNonZeroLength(line, 'px|rem|em'),
    spacing: hasNonZeroLength(spacingValue, 'px|rem'),
    borderRadius: hasNonZeroLength(radiusValue, 'px|rem|em') || hasNonZeroPercent(radiusValue),
    zIndex: Z_INDEX_RE.test(line),
  };
  return CATEGORIES.filter(category => checks[category]);
}

/**
 * Count offending lines per category in a single source string.
 * @param {string} source
 * @returns {Record<string, number>}
 */
export function countInSource(source) {
  const counts = Object.fromEntries(CATEGORIES.map(category => [category, 0]));
  for (const line of stripComments(source).split('\n')) {
    for (const category of categoriesForLine(line)) counts[category] += 1;
  }
  return counts;
}

const addCounts = (a, b) =>
  Object.fromEntries(CATEGORIES.map(category => [category, a[category] + b[category]]));

/**
 * @param {string} root
 * @param {string[]} appDirs
 * @returns {{ totals: Record<string, number>, byApp: Record<string, Record<string, number>> }}
 */
export function countForApps(root, appDirs) {
  const empty = Object.fromEntries(CATEGORIES.map(category => [category, 0]));
  const byApp = {};
  let totals = empty;
  for (const rel of appDirs) {
    let sub = empty;
    for (const file of listCssTsFiles(join(root, rel))) {
      sub = addCounts(sub, countInSource(readFileSync(file, 'utf8')));
    }
    byApp[rel] = sub;
    totals = addCounts(totals, sub);
  }
  return { totals, byApp };
}

// --- Ratchet (one-directional ceilings) --------------------------------------

/**
 * @param {number} currentCeiling
 * @param {number} measured
 * @returns {number}
 */
export function ratchetCeiling(currentCeiling, measured) {
  return measured < currentCeiling ? measured : currentCeiling;
}

/**
 * Lower each category ceiling to the measured count; never raise one. A category
 * with no ceiling yet is set to its measured count.
 * @param {Record<string, number>} ceilings
 * @param {Record<string, number>} measured
 * @returns {Record<string, number>}
 */
export function ratchetCeilings(ceilings, measured) {
  return Object.fromEntries(
    CATEGORIES.map(category => [
      category,
      ratchetCeiling(ceilings[category] ?? measured[category], measured[category]),
    ])
  );
}

/**
 * Categories whose measured count exceeds their ceiling. Categories without a
 * ceiling are not gated.
 * @param {Record<string, number>} ceilings
 * @param {Record<string, number>} measured
 * @returns {{ category: string, count: number, ceiling: number, delta: number }[]}
 */
export function findViolations(ceilings, measured) {
  return CATEGORIES.filter(
    category => ceilings[category] !== undefined && measured[category] > ceilings[category]
  ).map(category => ({
    category,
    count: measured[category],
    ceiling: ceilings[category],
    delta: measured[category] - ceilings[category],
  }));
}

// --- Report ----------------------------------------------------------------

/**
 * @param {Record<string, number>} totals
 * @param {Record<string, Record<string, number>>} byApp
 * @returns {string}
 */
export function formatReport(totals, byApp) {
  const header = ['App', ...CATEGORIES, 'total'];
  const row = (label, counts) => [
    label,
    ...CATEGORIES.map(category => String(counts[category])),
    String(CATEGORIES.reduce((sum, category) => sum + counts[category], 0)),
  ];
  const rows = [
    ...Object.entries(byApp).map(([rel, counts]) => row(rel, counts)),
    row('all', totals),
  ];
  const lines = [
    '# Design-token debt',
    '',
    'Lines in `apps/*/src/**/*.css.ts` with hard-coded values instead of `vars.*` tokens.',
    '',
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map(cells => `| ${cells.join(' | ')} |`),
    '',
    'Target: use `vars.*` from `lib.components` theme tokens. See the `design-tokens` skill.',
    '',
  ];
  return lines.join('\n');
}

// --- CLI -------------------------------------------------------------------

function readThreshold() {
  if (!existsSync(THRESHOLD_PATH)) return {};
  return JSON.parse(readFileSync(THRESHOLD_PATH, 'utf8')).ceilings ?? {};
}

function main() {
  const ratchet = process.argv.includes('--ratchet');

  const { totals, byApp } = countForApps(ROOT, APP_DIRS);
  const report = formatReport(totals, byApp);
  console.log(report);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) appendFileSync(summaryPath, `${report}\n`);

  const ceilings = readThreshold();

  if (ratchet) {
    const next = ratchetCeilings(ceilings, totals);
    for (const category of CATEGORIES) {
      console.log(
        `Ratchet ${category}: ceiling ${ceilings[category] ?? '(none)'} -> ${next[category]}`
      );
    }
    writeFileSync(THRESHOLD_PATH, `${JSON.stringify({ ceilings: next }, null, 2)}\n`);
    console.log(`Wrote ${THRESHOLD_PATH}`);
    return;
  }

  const violations = findViolations(ceilings, totals);
  if (violations.length === 0) return;
  for (const { category, count, ceiling, delta } of violations) {
    console.error(
      `Design-token debt increased in "${category}": ${count} lines exceed the ceiling of ${ceiling} (+${delta}).`
    );
  }
  console.error(
    'Use `vars.*` theme tokens instead of hard-coded values — see the `design-tokens` skill.'
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
