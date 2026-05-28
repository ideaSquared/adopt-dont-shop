#!/usr/bin/env node
/**
 * Fails CI when a markdown file under `docs/` is not linked from
 * `docs/README.md`. This is the safety net that ADS-716 asks for:
 * prevents docs from going orphaned and undiscoverable as the repo grows.
 *
 * Allowlist:
 *   - `docs/README.md` itself (it is the index)
 *   - `docs/legal/**` — legal docs are deep-linked from the app shells
 *     (cookie banner, footer, etc.), not from the developer-facing index.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = join(ROOT, 'docs');
const INDEX = join(DOCS_DIR, 'README.md');

function listMarkdownFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listMarkdownFiles(full));
      continue;
    }
    if (entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function isAllowlisted(relPath) {
  const parts = relPath.split(sep);
  if (relPath === 'README.md') return true;
  if (parts[0] === 'legal') return true;
  return false;
}

function extractLinkedPaths(indexBody) {
  // Match every markdown link target: [text](target)
  const linkRegex = /\[[^\]]*\]\(([^)]+)\)/g;
  const targets = new Set();
  let match;
  while ((match = linkRegex.exec(indexBody)) !== null) {
    const raw = match[1].split('#')[0].split(' ')[0].trim();
    if (!raw) continue;
    if (/^https?:\/\//.test(raw)) continue;
    targets.add(raw);
  }
  return targets;
}

function main() {
  try {
    statSync(INDEX);
  } catch {
    console.error(`Missing docs index: ${relative(ROOT, INDEX)}`);
    process.exit(1);
  }

  const indexBody = readFileSync(INDEX, 'utf8');
  const linked = extractLinkedPaths(indexBody);

  // Normalize linked targets relative to docs/ so we can compare against
  // file paths discovered under docs/. The index lives at docs/README.md,
  // so a link "./frontend/x.md" resolves to docs/frontend/x.md.
  const linkedDocsRelative = new Set();
  for (const target of linked) {
    if (target.startsWith('../')) continue; // points outside docs/
    const stripped = target.replace(/^\.\//, '');
    linkedDocsRelative.add(stripped);
  }

  const allDocs = listMarkdownFiles(DOCS_DIR).map((p) => relative(DOCS_DIR, p));
  const missing = allDocs
    .filter((p) => !isAllowlisted(p))
    .filter((p) => !linkedDocsRelative.has(p))
    .sort();

  if (missing.length === 0) {
    console.log(`OK — every docs/*.md is linked from ${relative(ROOT, INDEX)}.`);
    return;
  }

  console.error(`The following docs/*.md files are not linked from ${relative(ROOT, INDEX)}:`);
  for (const f of missing) console.error(`  - docs/${f}`);
  console.error('');
  console.error('Add an entry to docs/README.md under the appropriate section, or');
  console.error('extend the allowlist in scripts/check-docs-index.mjs if the file is');
  console.error('intentionally deep-linked from elsewhere (e.g. legal copy).');
  process.exit(1);
}

main();
