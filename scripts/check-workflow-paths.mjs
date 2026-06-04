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
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, '.github', 'workflow-source-paths.yml');

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

  if (failures.length === 0) {
    console.log('OK — workflow path filters match .github/workflow-source-paths.yml.');
    return;
  }
  console.error('Workflow path-filter drift detected:');
  for (const f of failures) console.error(`  - ${f}`);
  console.error('');
  console.error('Update .github/workflow-source-paths.yml (canonical source) and');
  console.error('mirror the change into each consumer workflow listed above.');
  process.exit(1);
}

main();
