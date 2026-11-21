#!/usr/bin/env node
/**
 * Shipper pin consistency guard (ENG-1511).
 *
 * ship.yml pins shipper's reusable workflows to a commit SHA in each `uses:`
 * line and passes the same SHA as the `shipper-ref` input, which is the ref
 * shipper checks out to run its gate and report scripts. Renovate's
 * github-actions manager bumps the `uses:` SHA but not `shipper-ref`, so an
 * accepted bump would run the new workflow with the old scripts. Every shipper
 * pin across .github/workflows must therefore be the same SHA. Quoted
 * shipper-ref values count; full-line and inline comments do not.
 *
 * Run via `node scripts/check-shipper-pins.mjs` or `pnpm check:shipper-pins`
 * (wired into `ci:local` and the workspace-drift job in ci.yml).
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOWS_DIR = join(ROOT, '.github', 'workflows');

const SHIPPER_PIN =
  /uses:\s*ideaSquared\/shipper\/\.github\/workflows\/[\w.-]+@([0-9a-f]{40})|shipper-ref:\s*['"]?([0-9a-f]{40})/g;

const isComment = line => /^\s*#/.test(line);
const stripInlineComment = line => line.replace(/\s+#.*$/, '');

/** Returns the distinct shipper SHAs pinned across the workflow files, sorted. */
export function findShipperPins(dir = WORKFLOWS_DIR) {
  const shas = readdirSync(dir)
    .filter(name => /\.ya?ml$/.test(name))
    .flatMap(name =>
      readFileSync(join(dir, name), 'utf8')
        .split('\n')
        .filter(line => !isComment(line))
        .map(stripInlineComment)
        .flatMap(line => [...line.matchAll(SHIPPER_PIN)].map(m => m[1] ?? m[2]))
    );
  return [...new Set(shas)].sort();
}

function main() {
  const pins = findShipperPins();
  if (pins.length <= 1) {
    console.log('OK — every shipper pin uses the same commit.');
    return;
  }
  console.error('Shipper pins in .github/workflows disagree:');
  pins.forEach(sha => console.error(`  - ${sha}`));
  console.error('Set every uses: SHA and every shipper-ref input to the same commit.');
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
