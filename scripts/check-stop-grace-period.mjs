#!/usr/bin/env node
/**
 * stop_grace_period guard (ADS-1309).
 *
 * The graceful-shutdown sequencer every gRPC service + the gateway run
 * (packages/service-bootstrap/src/shutdown.ts) budgets 25s to drain
 * in-flight requests/connections on SIGTERM. Docker's default
 * `stop_grace_period` is 10s, which SIGKILLs the process before that drain
 * completes — every deploy then drops in-flight requests.
 *
 * Scope: only the Node services that actually run that sequencer —
 * `service-*` entries in docker-compose.prod.yml (the gateway included; its
 * compose key is `service-gateway`). Third-party infrastructure containers
 * (database/redis/nats/clamav) and the static nginx-served SPA containers
 * (app-*, nginx) have no such drain logic, so they're out of scope here.
 *
 * This is a plain text/regex scan (matching check-docker-pinning.mjs's
 * approach) rather than a full YAML parse, so it only understands the two
 * shapes actually used in this file: a top-level `x-name: &anchor` block
 * that a service merges via `<<: *anchor`, or a literal `stop_grace_period:`
 * declared directly on the service.
 *
 * Run via `node scripts/check-stop-grace-period.mjs` or
 * `pnpm check:stop-grace-period` (wired into `ci:local`).
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const COMPOSE_FILE = 'docker-compose.prod.yml';

// Only compose keys in this prefix set run the drain sequencer. See the
// module doc comment above for why infra/app containers are excluded.
const SERVICE_PREFIX = 'service-';

const ANCHOR_DEF_RE = /^x-[\w-]+:\s*&([\w-]+)/;
const TOP_LEVEL_RE = /^\S/;
const SERVICE_KEY_RE = /^ {2}([\w-]+):\s*$/;
const MERGE_RE = /^\s*<<:\s*\*([\w-]+)/;
const STOP_GRACE_RE = /^\s*stop_grace_period:/;

/**
 * Maps each `x-name: &anchor` block in the file to whether that block
 * itself declares `stop_grace_period:`.
 */
export function findAnchorsWithStopGracePeriod(file, root = ROOT) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  const anchors = new Map();
  let current;

  for (const line of lines) {
    const anchorMatch = line.match(ANCHOR_DEF_RE);
    if (anchorMatch) {
      current = anchorMatch[1];
      anchors.set(current, false);
      continue;
    }
    if (current && TOP_LEVEL_RE.test(line)) {
      current = undefined; // left the anchor block
      continue;
    }
    if (current && STOP_GRACE_RE.test(line)) {
      anchors.set(current, true);
    }
  }
  return anchors;
}

/**
 * Returns the `service-*` compose service names under `services:` and, for
 * each, the lines belonging to that service's block.
 */
function findServiceBlocks(lines) {
  const blocks = [];
  let inServices = false;
  let current;

  lines.forEach(line => {
    if (line === 'services:') {
      inServices = true;
      return;
    }
    if (!inServices) return;
    if (TOP_LEVEL_RE.test(line)) {
      // De-indented back to column 0 — the `services:` map has ended
      // (e.g. `volumes:`).
      inServices = false;
      current = undefined;
      return;
    }
    const serviceMatch = line.match(SERVICE_KEY_RE);
    if (serviceMatch) {
      current = { name: serviceMatch[1], lines: [] };
      blocks.push(current);
      return;
    }
    if (current) {
      current.lines.push(line);
    }
  });
  return blocks;
}

/**
 * Finds every `service-*` entry in the compose file's `services:` map that
 * neither declares `stop_grace_period:` directly nor merges an anchor that
 * does. Returns `{ file, service }` for each failure.
 */
export function findServicesMissingStopGracePeriod(file, root = ROOT) {
  const content = readFileSync(join(root, file), 'utf8');
  const lines = content.split('\n');
  const anchors = findAnchorsWithStopGracePeriod(file, root);
  const blocks = findServiceBlocks(lines);

  const failures = [];
  for (const { name, lines: blockLines } of blocks) {
    if (!name.startsWith(SERVICE_PREFIX)) continue;

    const hasOwn = blockLines.some(l => STOP_GRACE_RE.test(l));
    if (hasOwn) continue;

    const mergesCoveredAnchor = blockLines.some(l => {
      const m = l.match(MERGE_RE);
      return m ? anchors.get(m[1]) === true : false;
    });
    if (mergesCoveredAnchor) continue;

    failures.push({ file, service: name });
  }
  return failures;
}

function main() {
  const failures = findServicesMissingStopGracePeriod(COMPOSE_FILE);

  if (failures.length === 0) {
    console.log(
      `OK — every service-* entry in ${COMPOSE_FILE} sets stop_grace_period (directly or via a merged anchor).`
    );
    return;
  }

  console.error('Service(s) missing stop_grace_period:');
  for (const { file, service } of failures) {
    console.error(`  - ${file}: ${service}`);
  }
  console.error('');
  console.error(
    "Add `stop_grace_period: 30s` to the service (or the anchor it merges via `<<:`) — Docker's " +
      'default 10s SIGKILLs the process before the 25s shutdown-sequencer drain budget ' +
      '(packages/service-bootstrap/src/shutdown.ts) completes.'
  );
  process.exit(1);
}

// Only run when executed directly, not when imported by the test file.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
