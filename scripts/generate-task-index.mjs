#!/usr/bin/env node
/**
 * Task index generator (ADS-795, ADS-949).
 *
 * Reads the root package.json and every workspace package.json
 * (apps/*, packages/*, services/*, e2e) and emits a categorized Markdown
 * reference of every runnable script to `docs/tasks.md`.
 *
 * Usage:
 *   node scripts/generate-task-index.mjs                # write docs/tasks.md
 *   node scripts/generate-task-index.mjs --print         # print the same Markdown to stdout (`pnpm run tasks`)
 *   node scripts/generate-task-index.mjs --help           # print a terminal-friendly categorised list with
 *                                                          # one-line descriptions, no file write (`pnpm run help`)
 *
 * The one-line descriptions used by --help live in one place —
 * scripts/script-descriptions.json — so there's a single source of truth
 * instead of duplicating them in comments per script. `checkDescriptionsCoverage`
 * (exported for scripts/check-docs-script-references.mjs) fails if a root
 * script has no matching entry.
 *
 * Mirrors the no-dependency, single-file style of scripts/check-*.mjs.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'docs', 'tasks.md');
const DESCRIPTIONS_PATH = join(ROOT, 'scripts', 'script-descriptions.json');

// Categories in display order. Each entry's matcher decides which root scripts
// land in that section; the first matching category wins, and anything left
// over falls into "Misc".
const CATEGORIES = [
  {
    name: 'Setup',
    match: name => /^(setup|prepare|secrets:|validate:|new-app|new-lib|generate:)/.test(name),
  },
  { name: 'Dev', match: name => /^dev(:|$)/.test(name) },
  { name: 'Build', match: name => /^build(:|$)/.test(name) },
  { name: 'Test', match: name => /^test(:|$)/.test(name) },
  { name: 'Quality', match: name => /^(lint|format|type-check|check:|graph)/.test(name) },
  { name: 'Docker', match: name => /^docker:/.test(name) },
  { name: 'CI', match: name => /^ci:/.test(name) },
  { name: 'Hooks', match: name => /^hooks:/.test(name) },
  { name: 'Production', match: name => /^prod:/.test(name) },
];

function readPkg(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function categorize(name) {
  const hit = CATEGORIES.find(c => c.match(name));
  return hit ? hit.name : 'Misc';
}

// Escape a script body for safe rendering inside a Markdown table cell.
function escapeCell(value) {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function listWorkspaceDirs() {
  const families = ['apps', 'packages', 'services'];
  const dirs = [];
  for (const family of families) {
    const familyDir = join(ROOT, family);
    let entries;
    try {
      entries = readdirSync(familyDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgPath = join(familyDir, entry.name, 'package.json');
      try {
        statSync(pkgPath);
      } catch {
        continue;
      }
      dirs.push({ family, path: pkgPath });
    }
  }
  const e2ePkg = join(ROOT, 'e2e', 'package.json');
  try {
    statSync(e2ePkg);
    dirs.push({ family: 'e2e', path: e2ePkg });
  } catch {
    // e2e workspace absent — skip.
  }
  return dirs;
}

function buildRootSections(rootScripts) {
  const grouped = new Map();
  for (const [name, body] of Object.entries(rootScripts)) {
    const category = categorize(name);
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push({ name, body });
  }
  const order = [...CATEGORIES.map(c => c.name), 'Misc'];
  const lines = [];
  for (const category of order) {
    const rows = grouped.get(category);
    if (!rows || rows.length === 0) continue;
    lines.push(`### ${category}`, '');
    lines.push('| Script | Command |', '| --- | --- |');
    for (const { name, body } of rows.sort((a, b) => a.name.localeCompare(b.name))) {
      lines.push(`| \`pnpm ${name}\` | \`${escapeCell(body)}\` |`);
    }
    lines.push('');
  }
  return lines;
}

function buildWorkspaceSection(workspaceDirs) {
  const lines = ['## Workspace scripts', ''];
  lines.push(
    'Each workspace package exposes its own scripts (run with',
    '`pnpm --filter <pkg> <script>` or `pnpm exec turbo run <script> --filter <pkg>`).',
    'The table lists the scripts each package defines.',
    ''
  );
  lines.push('| Package | Scripts |', '| --- | --- |');
  const rows = [];
  for (const { path } of workspaceDirs) {
    const pkg = readPkg(path);
    const name = pkg.name || relative(ROOT, dirname(path));
    const scripts = Object.keys(pkg.scripts || {}).sort();
    if (scripts.length === 0) continue;
    rows.push({ name, scripts });
  }
  for (const { name, scripts } of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`| \`${name}\` | ${scripts.map(s => `\`${s}\``).join(', ')} |`);
  }
  lines.push('');
  return lines;
}

function readDescriptions() {
  return JSON.parse(readFileSync(DESCRIPTIONS_PATH, 'utf8'));
}

// Exported for scripts/check-docs-script-references.mjs: every root script
// must have a one-line description, so `pnpm run help` is never missing an
// entry. Returns the list of undocumented script names (empty = OK).
export function checkDescriptionsCoverage() {
  const rootPkg = readPkg(join(ROOT, 'package.json'));
  const descriptions = readDescriptions();
  return Object.keys(rootPkg.scripts || {}).filter(name => !descriptions[name]);
}

// Terminal-friendly categorised list with descriptions — what `pnpm run help` prints.
function renderHelp() {
  const rootPkg = readPkg(join(ROOT, 'package.json'));
  const descriptions = readDescriptions();
  const grouped = new Map();
  for (const name of Object.keys(rootPkg.scripts || {})) {
    const category = categorize(name);
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(name);
  }
  const order = [...CATEGORIES.map(c => c.name), 'Misc'];
  const lines = ["Adopt Don't Shop — root scripts (pnpm run <script>)", ''];
  for (const category of order) {
    const names = grouped.get(category);
    if (!names || names.length === 0) continue;
    lines.push(`${category}:`);
    for (const name of names.sort()) {
      const description =
        descriptions[name] || '(no description — add one to scripts/script-descriptions.json)';
      lines.push(`  ${name.padEnd(24)} ${description}`);
    }
    lines.push('');
  }
  lines.push('Full command bodies + per-package scripts: pnpm run tasks (or see docs/tasks.md).');
  return lines.join('\n').replace(/\n+$/, '') + '\n';
}

function render() {
  const rootPkg = readPkg(join(ROOT, 'package.json'));
  const workspaceDirs = listWorkspaceDirs();

  const lines = [
    '# Task index',
    '',
    '> Generated by `scripts/generate-task-index.mjs` (`pnpm tasks`). Do not edit by hand —',
    '> rerun the generator after changing any `package.json` `scripts` block.',
    '',
    'Every runnable script in the monorepo, grouped by category. Root scripts run from',
    'the repo root with `pnpm <script>`.',
    '',
    '## Root scripts',
    '',
    ...buildRootSections(rootPkg.scripts || {}),
    ...buildWorkspaceSection(workspaceDirs),
  ];
  return lines.join('\n').replace(/\n+$/, '') + '\n';
}

function main() {
  if (process.argv.includes('--help')) {
    process.stdout.write(renderHelp());
    return;
  }
  const content = render();
  if (process.argv.includes('--print')) {
    process.stdout.write(content);
    return;
  }
  writeFileSync(OUTPUT, content);
  console.log(`Wrote ${relative(ROOT, OUTPUT)} (${content.split('\n').length} lines).`);
}

// Only run when executed directly (not when imported by check-docs-script-references.mjs).
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
