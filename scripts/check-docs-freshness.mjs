#!/usr/bin/env node
/**
 * Nightly docs-freshness report (ADS-954).
 *
 * `docs/` has 38+ top-level markdown files plus subdirectories, and
 * `check-docs-index.mjs` only verifies every file is *linked* from
 * `docs/README.md` — nothing tracks staleness or broken cross-links. This
 * script fills that gap with two checks:
 *
 *   1. Broken-link scan — every relative markdown link (and `#anchor`) in
 *      docs/**\/*.md + the root markdown files is resolved against the
 *      filesystem and, for same-repo anchors, against the target file's
 *      headings. External `http(s)` links are optionally verified with a
 *      real request (opt-in via --check-external, since it needs network
 *      access and is too slow/flaky for a fast local run).
 *   2. Stale-doc scan — every markdown file is sorted by
 *      `git log -1 --format=%cs` (last commit date that touched it); files
 *      not touched in more than --stale-days (default 365) are flagged as
 *      "review needed".
 *
 * This is a *report*, not a merge gate: it always exits 0 unless --strict
 * is passed (broken internal links then fail the run). Nightly CI writes
 * the output to the job summary; run locally with `pnpm check:docs-freshness`.
 *
 * Usage:
 *   node scripts/check-docs-freshness.mjs [options]
 *
 * Options:
 *   --check-external      Also verify http(s) links with a real request.
 *   --stale-days <n>      Staleness threshold in days (default: 365).
 *   --strict              Exit 1 if any internal link/anchor is broken.
 *   --out <path>          Write the markdown report to a file (in addition
 *                         to stdout). Defaults to $GITHUB_STEP_SUMMARY when
 *                         that env var is set (GitHub Actions job summary).
 */
import { execFileSync } from 'child_process';
import { readdirSync, readFileSync, appendFileSync, statSync } from 'fs';
import { dirname, join, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = join(ROOT, 'docs');
const ROOT_MARKDOWN = ['README.md', 'CONTRIBUTING.md', 'DESIGN_TOKENS.md'];
const DEFAULT_STALE_DAYS = 365;
const EXTERNAL_TIMEOUT_MS = 8000;

// --- Discovery -------------------------------------------------------------

export function listMarkdownFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listMarkdownFiles(full));
      continue;
    }
    if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

export function collectTargetFiles(root = ROOT, docsDir = DOCS_DIR) {
  const rootFiles = ROOT_MARKDOWN.map(name => join(root, name)).filter(p => {
    try {
      statSync(p);
      return true;
    } catch {
      return false;
    }
  });
  return [...rootFiles, ...listMarkdownFiles(docsDir)];
}

// --- Link extraction & classification ---------------------------------------

// Matches `[text](target)` — including the image form `![alt](target)`,
// since a broken image source is just as much a broken link.
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

export function extractLinks(content) {
  const links = [];
  let match;
  while ((match = LINK_RE.exec(content)) !== null) {
    const raw = match[1].split(' ')[0].trim();
    if (raw) links.push(raw);
  }
  return links;
}

export function classifyLink(target) {
  if (/^https?:\/\//.test(target)) return 'external';
  if (/^mailto:/.test(target)) return 'skip';
  if (target.startsWith('#')) return 'same-file-anchor';
  return 'internal';
}

// --- Heading / anchor resolution --------------------------------------------

export function extractHeadings(content) {
  return content
    .split('\n')
    .filter(line => /^#{1,6}\s+/.test(line))
    .map(line => line.replace(/^#{1,6}\s+/, '').trim());
}

// A minimal implementation of GitHub's heading-to-anchor slug algorithm:
// lowercase, strip characters that aren't a letter/number/space/hyphen,
// then turn each remaining space into a hyphen (consecutive spaces —
// e.g. from a removed "/" or "(" — become consecutive hyphens, GitHub does
// not collapse them). Does not attempt duplicate-heading disambiguation
// (`-1`, `-2`, ...) — good enough for a non-blocking report.
export function githubSlug(heading) {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^\w \-]/g, '')
    .replace(/ /g, '-');
}

export function anchorExists(content, anchor) {
  const slug = anchor.toLowerCase();
  return extractHeadings(content).some(h => githubSlug(h) === slug);
}

// --- Internal link checking --------------------------------------------------

export function checkInternalLink(fromFile, target, root = ROOT) {
  const [pathPart, anchor] = target.split('#');

  if (!pathPart) {
    // Same-file anchor written as a plain relative link, e.g. `(#section)`
    // handled by classifyLink separately; defensive fallback here.
    const content = readFileSync(fromFile, 'utf8');
    if (anchor && !anchorExists(content, anchor)) {
      return { ok: false, reason: 'missing-anchor' };
    }
    return { ok: true };
  }

  const resolved = join(dirname(fromFile), pathPart);
  let stat;
  try {
    stat = statSync(resolved);
  } catch {
    return { ok: false, reason: 'missing-file', resolved };
  }

  if (anchor) {
    // Only markdown targets carry headings we can check.
    if (stat.isFile() && extname(resolved) === '.md') {
      const targetContent = readFileSync(resolved, 'utf8');
      if (!anchorExists(targetContent, anchor)) {
        return { ok: false, reason: 'missing-anchor', resolved };
      }
    }
  }

  return { ok: true, resolved };
}

export function checkSameFileAnchor(fromFile, target) {
  const anchor = target.slice(1);
  if (!anchor) return { ok: true };
  const content = readFileSync(fromFile, 'utf8');
  if (!anchorExists(content, anchor)) {
    return { ok: false, reason: 'missing-anchor' };
  }
  return { ok: true };
}

// --- External link checking (network, opt-in) --------------------------------

export async function checkExternalLink(url, timeoutMs = EXTERNAL_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' });
    }
    return { ok: response.status < 400, status: response.status };
  } catch (error) {
    return { ok: false, error: error.message ?? String(error) };
  } finally {
    clearTimeout(timer);
  }
}

// --- Staleness ----------------------------------------------------------------

export function getLastCommitDate(file, root = ROOT) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', relative(root, file)], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export function daysSince(dateStr, now = new Date()) {
  const then = new Date(`${dateStr}T00:00:00Z`);
  const diffMs = now.getTime() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isStale(dateStr, staleDays = DEFAULT_STALE_DAYS, now = new Date()) {
  if (!dateStr) return false; // no git history (e.g. new/untracked) — nothing to flag yet
  return daysSince(dateStr, now) >= staleDays;
}

// --- Report assembly ------------------------------------------------------

export function formatReport({ brokenLinks, staleDocs, externalResults, staleDays }) {
  const lines = ['# Docs freshness report', ''];

  lines.push('## Broken internal links');
  lines.push('');
  if (brokenLinks.length === 0) {
    lines.push('None found.');
  } else {
    lines.push('| File | Link | Problem |');
    lines.push('| --- | --- | --- |');
    for (const { file, target, reason } of brokenLinks) {
      lines.push(`| \`${file}\` | \`${target}\` | ${reason} |`);
    }
  }
  lines.push('');

  if (externalResults && externalResults.length > 0) {
    lines.push('## Broken external links');
    lines.push('');
    const broken = externalResults.filter(r => !r.ok);
    if (broken.length === 0) {
      lines.push('None found.');
    } else {
      lines.push('| File | URL | Problem |');
      lines.push('| --- | --- | --- |');
      for (const { file, url, status, error } of broken) {
        lines.push(`| \`${file}\` | ${url} | ${status ? `HTTP ${status}` : error} |`);
      }
    }
    lines.push('');
  }

  lines.push(`## Stale docs (not touched in ${staleDays}+ days)`);
  lines.push('');
  if (staleDocs.length === 0) {
    lines.push('None found.');
  } else {
    lines.push('| File | Last touched | Days ago |');
    lines.push('| --- | --- | --- |');
    for (const { file, lastCommitDate, days } of staleDocs) {
      lines.push(`| \`${file}\` | ${lastCommitDate} | ${days} |`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

// --- CLI -----------------------------------------------------------------

function parseArgs(argv) {
  const args = { checkExternal: false, strict: false, staleDays: DEFAULT_STALE_DAYS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check-external') {
      args.checkExternal = true;
      continue;
    }
    if (arg === '--strict') {
      args.strict = true;
      continue;
    }
    if (arg === '--stale-days') {
      args.staleDays = Number(argv[(i += 1)]);
      continue;
    }
    if (arg === '--out') {
      args.out = argv[(i += 1)];
      continue;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const files = collectTargetFiles();

  const brokenLinks = [];
  const externalLinks = [];
  const staleDocs = [];

  for (const file of files) {
    const relFile = relative(ROOT, file);
    const content = readFileSync(file, 'utf8');

    for (const target of extractLinks(content)) {
      const kind = classifyLink(target);
      if (kind === 'skip') continue;
      if (kind === 'external') {
        if (args.checkExternal) externalLinks.push({ file: relFile, url: target });
        continue;
      }
      const result =
        kind === 'same-file-anchor'
          ? checkSameFileAnchor(file, target)
          : checkInternalLink(file, target);
      if (!result.ok) {
        brokenLinks.push({ file: relFile, target, reason: result.reason });
      }
    }

    const lastCommitDate = getLastCommitDate(file);
    if (isStale(lastCommitDate, args.staleDays)) {
      staleDocs.push({ file: relFile, lastCommitDate, days: daysSince(lastCommitDate) });
    }
  }

  let externalResults = [];
  if (args.checkExternal && externalLinks.length > 0) {
    externalResults = await Promise.all(
      externalLinks.map(async ({ file, url }) => ({ file, url, ...(await checkExternalLink(url)) }))
    );
  }

  staleDocs.sort((a, b) => b.days - a.days);
  brokenLinks.sort((a, b) => a.file.localeCompare(b.file));

  const report = formatReport({
    brokenLinks,
    staleDocs,
    externalResults,
    staleDays: args.staleDays,
  });
  console.log(report);

  const summaryPath = args.out ?? process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, `${report}\n`);
  }

  console.log(
    `Scanned ${files.length} file(s): ${brokenLinks.length} broken internal link(s), ` +
      `${externalResults.filter(r => !r.ok).length} broken external link(s), ${staleDocs.length} stale doc(s).`
  );

  if (args.strict && brokenLinks.length > 0) {
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
