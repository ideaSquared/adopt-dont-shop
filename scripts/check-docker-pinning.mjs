#!/usr/bin/env node
/**
 * Production base-image digest-pinning guard (ADS-846).
 *
 * Every third-party base image in the production and staging compose files
 * must be pinned to an immutable digest (`tag@sha256:...`), not a bare tag.
 * A bare tag silently rolls forward (registry compromise, account takeover,
 * tag drift across patch releases) and gives the deploy no integrity check.
 *
 * First-party images (`ghcr.io/ideasquared/...`) are intentionally pinned by
 * the `DEPLOY_SHA` build arg, not a digest, so they are skipped here.
 *
 * Renovate keeps the digests current (renovate.json `pinDigests` for docker).
 * This guard fails CI if a third-party `image:` in the prod/staging compose
 * files is introduced or edited without an `@sha256:` digest.
 *
 * Run via `node scripts/check-docker-pinning.mjs` or `pnpm check:docker-pinning`
 * (wired into `ci:local` and the workspace-drift job in ci.yml).
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const COMPOSE_FILES = ['docker-compose.prod.yml', 'docker-compose.staging.yml'];

// First-party images are pinned by DEPLOY_SHA, not a digest — skip them.
const FIRST_PARTY_PREFIX = 'ghcr.io/ideasquared/';

function findUnpinnedImages(file) {
  const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
  const failures = [];
  lines.forEach((line, index) => {
    const match = line.match(/^\s*image:\s*(\S+)\s*$/);
    if (!match) return;
    const ref = match[1];
    if (ref.startsWith(FIRST_PARTY_PREFIX)) return;
    if (ref.includes('@sha256:')) return;
    failures.push({ file, line: index + 1, ref });
  });
  return failures;
}

function main() {
  const failures = COMPOSE_FILES.flatMap(findUnpinnedImages);

  if (failures.length === 0) {
    console.log('OK — every third-party image in prod/staging compose is digest-pinned.');
    return;
  }

  console.error('Unpinned third-party base image(s) detected:');
  for (const { file, line, ref } of failures) {
    console.error(`  - ${file}:${line} — ${ref}`);
  }
  console.error('');
  console.error('Pin each to an immutable digest, e.g.:');
  console.error(
    "  docker manifest inspect <image> | jq -r '.config.digest' (or the Docker-Content-Digest header)"
  );
  console.error('  image: nginx:1.27-alpine@sha256:<digest>');
  process.exit(1);
}

main();
