#!/usr/bin/env node
/**
 * Docs ↔ scripts reference guard (ADS-795).
 *
 * Fails CI when a Markdown file references a package script that no longer
 * exists. Catches the recurring doc-drift where README / CONTRIBUTING /
 * CLAUDE.md keep naming `pnpm <foo>` long after `<foo>` was renamed or removed.
 *
 * What it checks: occurrences of the explicit `pnpm run <name>` / `npm run
 * <name>` form. A reference is valid if `<name>` is a script in the root
 * package.json OR any workspace package.json. The bare `pnpm <name>` form is
 * deliberately NOT matched — it collides with prose ("pnpm is…"), pnpm
 * subcommands, and scripts that only exist inside service containers
 * (`docker compose exec service-x pnpm db:migrate`), which would produce false
 * positives across docs this guard does not own. The `run` keyword is the
 * unambiguous signal that an actual package script is being invoked.
 *
 * Also fails (ADS-949) if any root package.json script has no entry in
 * scripts/script-descriptions.json — that map is the single source of
 * truth `pnpm commands` reads, so an undocumented script would silently
 * fall out of the discoverable list.
 *
 * Mirrors the no-dependency single-file style of scripts/check-*.mjs.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { checkDescriptionsCoverage } from './generate-task-index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function collectScriptNames() {
  const names = new Set();
  const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  for (const name of Object.keys(rootPkg.scripts || {})) names.add(name);

  const families = ['apps', 'packages', 'services'];
  for (const family of families) {
    let entries;
    try {
      entries = readdirSync(join(ROOT, family), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgPath = join(ROOT, family, entry.name, 'package.json');
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        for (const name of Object.keys(pkg.scripts || {})) names.add(name);
      } catch {
        // No package.json — skip.
      }
    }
  }
  const e2ePkg = join(ROOT, 'e2e', 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(e2ePkg, 'utf8'));
    for (const name of Object.keys(pkg.scripts || {})) names.add(name);
  } catch {
    // e2e absent — skip.
  }
  return names;
}

function listMarkdown(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listMarkdown(full));
      continue;
    }
    if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

// Matches the explicit `pnpm run foo` / `npm run foo` form only. The package
// manager keyword is captured so the failure message can quote the exact form
// that appears in the doc. The script name is a single token of
// [a-z][a-z0-9:_-]*.
const REF_RE = /\b(pnpm|npm) run\s+([a-z][a-z0-9:_-]*)/g;

function findBadRefs(file, known) {
  const contents = readFileSync(file, 'utf8');
  const bad = [];
  let m;
  while ((m = REF_RE.exec(contents)) !== null) {
    const pm = m[1];
    const name = m[2];
    if (known.has(name)) continue;
    bad.push({ pm, name });
  }
  const seen = new Set();
  return bad.filter(({ pm, name }) => {
    const key = `${pm} run ${name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function main() {
  const known = collectScriptNames();
  const docsToScan = [
    join(ROOT, 'README.md'),
    join(ROOT, 'CONTRIBUTING.md'),
    join(ROOT, '.claude', 'CLAUDE.md'),
    ...listMarkdown(join(ROOT, 'docs')),
  ].filter(p => {
    try {
      statSync(p);
      return true;
    } catch {
      return false;
    }
  });

  const failures = [];
  for (const file of docsToScan) {
    const bad = findBadRefs(file, known);
    for (const { pm, name } of bad) {
      failures.push(
        `${relative(ROOT, file)}: references '${pm} run ${name}' but no package defines a '${name}' script`
      );
    }
  }

  // ADS-993: guard against the bare `pnpm setup` / `pnpm help` forms. Both are
  // reserved pnpm built-in subcommands, so a bare invocation silently runs
  // pnpm's own command instead of any package.json script. The onboarding
  // script was renamed to `pnpm bootstrap` and the discovery script to
  // `pnpm commands` precisely to escape this shadow; documenting the bare
  // forms would re-break the very onboarding path this repo advertises. (The
  // `pnpm run <name>` guard above cannot catch these — it only matches the
  // explicit `run` form.)
  const SHADOWED_BUILTIN_RE = /\bpnpm (setup|help)\b/g;
  for (const file of docsToScan) {
    const contents = readFileSync(file, 'utf8');
    const seen = new Set();
    let m;
    while ((m = SHADOWED_BUILTIN_RE.exec(contents)) !== null) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      const replacement = m[1] === 'setup' ? 'pnpm bootstrap' : 'pnpm commands';
      failures.push(
        `${relative(ROOT, file)}: uses the shadowed built-in form 'pnpm ${m[1]}' — use '${replacement}' (ADS-993)`
      );
    }
  }

  const undocumented = checkDescriptionsCoverage();
  for (const name of undocumented) {
    failures.push(
      `scripts/script-descriptions.json: missing a description for root script '${name}' (pnpm commands would omit it)`
    );
  }

  if (failures.length === 0) {
    console.log(
      'OK — every documented pnpm script reference resolves to a real script, and every root script has a help description.'
    );
    return;
  }

  console.error('Docs / script-description drift found:');
  for (const f of failures) console.error(`  - ${f}`);
  console.error('');
  console.error(
    'Fix the doc (rename/remove the stale reference), add the missing script, or add a description to scripts/script-descriptions.json.'
  );
  process.exit(1);
}

main();
