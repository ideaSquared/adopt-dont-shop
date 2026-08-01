#!/usr/bin/env node
/**
 * Workflow path-filter consistency guard (ADS-767).
 *
 * The canonical "source paths that matter" list lives in
 * .github/workflow-source-paths.yml. This guard parses that file plus
 * every consumer workflow listed in its `consumers:` block, and fails
 * when the consumer's `paths:` filter for the declared trigger drifts
 * from the canonical list (plus any declared `extra:` paths for that
 * consumer).
 *
 * Why this and not a reusable workflow / composite action? GitHub
 * Actions requires `paths:` filters to live inline on each workflow's
 * `on:` trigger — they cannot be sourced from a reusable workflow.
 * The guard is the next-best thing: drift fails CI before merge.
 *
 * Run via `node scripts/check-workflow-paths.mjs` or as part of the
 * workspace-drift job in ci.yml.
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, '.github', 'workflow-source-paths.yml');
const WORKFLOWS_DIR = join(ROOT, '.github', 'workflows');

function parseCanonicalSource(yaml) {
  // Tiny ad-hoc parser — the source file is intentionally simple so we
  // don't pull in a YAML dep. Supports the two top-level keys we need:
  // `paths:` (list of quoted strings) and `consumers:` (list of objects
  // with workflow / triggers / extra).
  const lines = yaml.split('\n');
  const paths = [];
  const consumers = [];
  let mode = null;
  let current = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (line.startsWith('paths:')) {
      mode = 'paths';
      continue;
    }
    if (line.startsWith('consumers:')) {
      mode = 'consumers';
      continue;
    }
    if (mode === 'paths' && /^\s+-\s+['"]?(.+?)['"]?\s*$/.test(line)) {
      paths.push(line.match(/^\s+-\s+['"]?(.+?)['"]?\s*$/)[1]);
      continue;
    }
    if (mode === 'consumers') {
      if (/^\s+-\s+workflow:\s+(.+)$/.test(line)) {
        if (current) consumers.push(current);
        current = {
          workflow: line.match(/^\s+-\s+workflow:\s+(.+)$/)[1].trim(),
          triggers: [],
          extra: [],
        };
        continue;
      }
      if (current && /^\s+triggers:\s+\[(.+)\]$/.test(line)) {
        current.triggers = line
          .match(/^\s+triggers:\s+\[(.+)\]$/)[1]
          .split(',')
          .map(s => s.trim());
        continue;
      }
      if (current && /^\s+extra:\s+\[\]$/.test(line)) {
        current.extra = [];
        continue;
      }
      if (current && /^\s+extra:\s*$/.test(line)) {
        current.__inExtra = true;
        continue;
      }
      if (current && current.__inExtra && /^\s+-\s+['"]?(.+?)['"]?\s*$/.test(line)) {
        current.extra.push(line.match(/^\s+-\s+['"]?(.+?)['"]?\s*$/)[1]);
        continue;
      }
      // Any other indentation level closes the extra block.
      if (current && current.__inExtra && !/^\s+-/.test(line)) {
        current.__inExtra = false;
      }
    }
  }
  if (current) consumers.push(current);
  return { paths, consumers };
}

function extractTriggerPaths(workflowYaml, trigger) {
  // Walk line-by-line to find the `paths:` list under `on.<trigger>`.
  // Tracking indent depth is simpler than balanced multi-line regex.
  const lines = workflowYaml.split('\n');
  let inOn = false;
  let inTrigger = false;
  let inPaths = false;
  let pathsIndent = -1;
  const items = [];
  for (const line of lines) {
    if (/^on:\s*$/.test(line)) {
      inOn = true;
      continue;
    }
    if (inOn && /^[A-Za-z]/.test(line)) {
      break;
    }
    if (!inOn) continue;
    const triggerMatch = line.match(/^\s{2}([a-z_]+):\s*$/);
    if (triggerMatch) {
      inTrigger = triggerMatch[1] === trigger;
      inPaths = false;
      continue;
    }
    if (!inTrigger) continue;
    const pathsMatch = line.match(/^(\s{4})paths:\s*$/);
    if (pathsMatch) {
      inPaths = true;
      pathsIndent = pathsMatch[1].length;
      continue;
    }
    if (!inPaths) continue;
    const itemMatch = line.match(/^(\s+)-\s+['"]?(.+?)['"]?\s*$/);
    if (itemMatch && itemMatch[1].length > pathsIndent) {
      items.push(itemMatch[2]);
      continue;
    }
    // Anything else at <= pathsIndent ends the paths list.
    if (line.trim() && !/^\s+#/.test(line)) {
      inPaths = false;
    }
  }
  return items.length > 0 ? items : null;
}

function eqSet(a, b) {
  if (a.length !== b.length) return false;
  const A = [...a].sort();
  const B = [...b].sort();
  return A.every((v, i) => v === B[i]);
}

// ADS-1030: a literal (non-glob) path entry that matches no file on disk is a
// bug — the filter it lives in silently gates nothing (as `tsconfig.json` did:
// no such file exists at the root, so a shared-config change ran zero jobs).
// Glob patterns are skipped; only exact paths are asserted to exist.
const GLOB_METACHARS = /[*?[\]{}!]/;

export const isGlobPattern = pattern => GLOB_METACHARS.test(pattern);

// Collect every list item from `paths:`, `paths-ignore:` and (dorny
// paths-filter) `filters:` blocks in a workflow file. Sub-keys inside a
// `filters:` block (e.g. `backend:`) are not list items and are ignored; only
// their `- 'glob'` entries are collected. Returns globs and literals alike.
export function collectFilterPaths(yaml) {
  const lines = yaml.split('\n');
  const items = [];
  let blockIndent = -1; // indent of the enclosing paths/filters key; -1 = outside
  const asBlockKey = line => line.match(/^(\s*)(?:paths|paths-ignore|filters):\s*\|?\s*$/);
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    if (blockIndent < 0) {
      const key = asBlockKey(line);
      if (key) blockIndent = key[1].length;
      continue;
    }
    if (indent <= blockIndent) {
      // Dedent closes the block; this same line may open the next one.
      blockIndent = -1;
      const key = asBlockKey(line);
      if (key) blockIndent = key[1].length;
      continue;
    }
    const item = line.match(/^\s*-\s+['"]?(.+?)['"]?\s*$/);
    if (item) items.push(item[1]);
  }
  return items;
}

// Given the collected path items, return the literal ones that don't resolve
// to a file or directory under `root`.
export function missingLiteralPaths(items, root) {
  return items.filter(p => !isGlobPattern(p) && !existsSync(join(root, p)));
}

// Scan every workflow file and report [{ workflow, path }] for each literal
// path that matches nothing on disk.
export function findMissingWorkflowPaths(workflowsDir = WORKFLOWS_DIR, root = ROOT) {
  const failures = [];
  for (const file of readdirSync(workflowsDir).filter(f => /\.ya?ml$/.test(f))) {
    const items = collectFilterPaths(readFileSync(join(workflowsDir, file), 'utf8'));
    for (const missing of missingLiteralPaths(items, root)) {
      failures.push({ workflow: join('.github', 'workflows', file), path: missing });
    }
  }
  return failures;
}

function main() {
  const source = parseCanonicalSource(readFileSync(SOURCE, 'utf8'));
  const failures = [];
  for (const consumer of source.consumers) {
    const workflowPath = join(ROOT, consumer.workflow);
    let yaml;
    try {
      yaml = readFileSync(workflowPath, 'utf8');
    } catch {
      failures.push(`[${consumer.workflow}] file not found`);
      continue;
    }
    const expected = [...source.paths, ...consumer.extra];
    for (const trigger of consumer.triggers) {
      const actual = extractTriggerPaths(yaml, trigger);
      if (actual === null) {
        failures.push(
          `[${consumer.workflow}] no \`paths:\` block under \`on.${trigger}\` — expected ${expected.length} entries.`,
        );
        continue;
      }
      if (!eqSet(actual, expected)) {
        const missing = expected.filter(p => !actual.includes(p));
        const extra = actual.filter(p => !expected.includes(p));
        failures.push(
          `[${consumer.workflow}] \`on.${trigger}.paths\` drift:` +
            (missing.length ? `\n    missing: ${missing.join(', ')}` : '') +
            (extra.length ? `\n    extra:   ${extra.join(', ')}` : ''),
        );
      }
    }
  }

  // ADS-1030: every literal path in any workflow's paths/filters block must
  // exist, or the filter silently gates nothing.
  const missingPaths = findMissingWorkflowPaths();
  for (const { workflow, path } of missingPaths) {
    failures.push(
      `[${workflow}] filter path \`${path}\` matches no file or directory — ` +
        `it silently gates nothing. Fix the path or make it a glob.`,
    );
  }

  if (failures.length === 0) {
    console.log(
      'OK — workflow path filters match .github/workflow-source-paths.yml, ' +
        'and every literal filter path exists.',
    );
    return;
  }
  console.error('Workflow path-filter drift detected:');
  for (const f of failures) console.error(`  - ${f}`);
  console.error('');
  console.error('Update .github/workflow-source-paths.yml (canonical source) and');
  console.error('mirror the change into each consumer workflow listed above.');
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
