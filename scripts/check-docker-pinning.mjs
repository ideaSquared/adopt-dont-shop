#!/usr/bin/env node
/**
 * Production base-image digest-pinning guard (ADS-846, extended by ADS-971).
 *
 * Every third-party base image in the production/staging compose files AND
 * every third-party `FROM` in the repo-root Dockerfiles must be pinned to an
 * immutable digest (`tag@sha256:...`), not a bare tag. A bare tag silently
 * rolls forward (registry compromise, account takeover, tag drift across
 * patch releases) and gives the build/deploy no integrity check.
 *
 * First-party images (`ghcr.io/ideasquared/...`) are intentionally pinned by
 * the `DEPLOY_SHA` build arg, not a digest, so they are skipped here. Internal
 * multi-stage `FROM <stage> AS <name>` references (e.g. `FROM base AS build`)
 * are also skipped — they reference an earlier stage in the same file, not a
 * registry image.
 *
 * Renovate keeps the digests current (renovate.json `pinDigests` for docker).
 * This guard fails CI if a third-party image in the prod/staging compose
 * files, or a third-party `FROM` in a Dockerfile, is introduced or edited
 * without an `@sha256:` digest.
 *
 * Run via `node scripts/check-docker-pinning.mjs` or `pnpm check:docker-pinning`
 * (wired into `ci:local` and the workspace-drift job in ci.yml).
 */
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const COMPOSE_FILES = ['docker-compose.prod.yml', 'docker-compose.staging.yml'];

// First-party images are pinned by DEPLOY_SHA, not a digest — skip them.
const FIRST_PARTY_PREFIX = 'ghcr.io/ideasquared/';

export function findDockerfiles(root) {
  return readdirSync(root)
    .filter(name => name === 'Dockerfile' || name.startsWith('Dockerfile.'))
    .sort();
}

export function findUnpinnedImages(file, root = ROOT) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
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

export function findUnpinnedFromLines(file, root = ROOT) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  const stageNames = new Set();
  const failures = [];
  lines.forEach((line, index) => {
    const match = line.match(/^\s*FROM\s+(\S+)(?:\s+AS\s+(\S+))?\s*$/i);
    if (!match) return;
    const [, ref, stageName] = match;
    const isInternalStageRef = stageNames.has(ref);
    if (!isInternalStageRef && !ref.startsWith(FIRST_PARTY_PREFIX) && !ref.includes('@sha256:')) {
      failures.push({ file, line: index + 1, ref });
    }
    if (stageName) stageNames.add(stageName);
  });
  return failures;
}

function main() {
  const composeFailures = COMPOSE_FILES.flatMap(file => findUnpinnedImages(file));
  const dockerfiles = findDockerfiles(ROOT);
  const dockerfileFailures = dockerfiles.flatMap(file => findUnpinnedFromLines(file));
  const failures = [...composeFailures, ...dockerfileFailures];

  if (failures.length === 0) {
    console.log(
      'OK — every third-party image in prod/staging compose and every Dockerfile FROM is digest-pinned.'
    );
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
  console.error('  FROM node:22.15.1-slim@sha256:<digest> AS base');
  process.exit(1);
}

// Only run when executed directly (`node scripts/check-docker-pinning.mjs`),
// not when imported by the test file.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
