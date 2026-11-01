#!/usr/bin/env node
/**
 * Dev/e2e persona seed.
 *
 * Two phases:
 *
 *   1. SQL bootstrap — the only rows no API can create. Runs each service's
 *      `db:seed` inside its container via `docker compose exec`:
 *        service-auth  — the super_admin (POST /admin/users needs an admin)
 *        service-pets  — the breed reference list (there is no breed API)
 *   2. API generation — everything else (admins, rescues, staff, adopters,
 *      pets, favourites, an application, a chat) is created through the
 *      gateway as real users would, so the seed can never drift from what the
 *      API accepts: scripts/lib/seed-generate.mjs, data in
 *      scripts/lib/seed-personas.mjs.
 *
 * Phase 2 completes sign-ups with the gateway's test-only token-peek routes,
 * so the gateway must run with E2E_TOKEN_PEEK=true (docker-compose.dev.yml
 * defaults it on).
 *
 * Idempotent: phase 1 upserts, phase 2 looks before it creates. Safe to
 * re-run. A fresh `pnpm docker:dev` runs phase 1 on container boot and phase 2
 * in the one-shot `seed-personas` container, so you only need this after
 * `pnpm docker:reset` or to repair a dataset an e2e run has changed:
 *
 *   pnpm docker:dev:detach
 *   pnpm db:seed
 *
 * Flags / env:
 *   --api-only        skip phase 1 (the seed-personas container uses this)
 *   SEED_API_URL      gateway base URL (default http://localhost:4000)
 *   SEED_PASSWORD     password for every persona (default DevPassword123!)
 *   SEED_DOCKER       docker binary for phase 1 (default docker)
 *
 * HOST-side script: it must NOT import any @adopt-dont-shop/* workspace
 * package (host scripts that pull in workspace code break outside the
 * container's module graph).
 */
import { spawnSync } from 'node:child_process';

import { createGenerator } from './lib/seed-generate.mjs';
import * as personas from './lib/seed-personas.mjs';

const DOCKER = process.env.SEED_DOCKER ?? 'docker';
const API_URL = (process.env.SEED_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const PASSWORD = process.env.SEED_PASSWORD?.trim() || 'DevPassword123!';
const GATEWAY_WAIT_MS = 180_000;

// [compose service, workspace package, label]. The --filter is required:
// containers run with working_dir=/app, so a bare `pnpm run db:seed` would
// resolve the ROOT db:seed (this script) instead of the service's own.
const BOOTSTRAP_TARGETS = [
  ['service-auth', '@adopt-dont-shop/service.auth', 'super_admin'],
  ['service-pets', '@adopt-dont-shop/service.pets', 'breed reference data'],
];

function runBootstrap(service, pkg, label) {
  process.stdout.write(`\n→ bootstrapping ${label} (${service})...\n`);
  const result = spawnSync(
    DOCKER,
    ['compose', 'exec', '-T', service, 'pnpm', '--filter', pkg, 'run', 'db:seed'],
    { stdio: 'inherit' }
  );
  if (result.error) {
    throw new Error(
      `failed to exec into ${service}: ${result.error.message}. ` +
        `Is the stack running? Try 'pnpm docker:dev:detach' first.`
    );
  }
  if (result.status !== 0) {
    throw new Error(`seed for ${service} exited with code ${result.status}`);
  }
}

async function waitForGateway() {
  const deadline = Date.now() + GATEWAY_WAIT_MS;
  for (;;) {
    try {
      const res = await fetch(`${API_URL}/health/ready`);
      if (res.ok) {
        return;
      }
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) {
      throw new Error(`gateway at ${API_URL} not ready after ${GATEWAY_WAIT_MS / 1000}s`);
    }
    await new Promise(resolve => setTimeout(resolve, 2_000));
  }
}

async function assertTokenPeekEnabled() {
  const res = await fetch(`${API_URL}/api/v1/test/auth-token`);
  // Enabled: 400 (no email given). Disabled: the route isn't registered → 404.
  if (res.status === 404) {
    throw new Error(
      'the gateway has the token-peek seam off, so sign-ups cannot be completed. ' +
        'Start it with E2E_TOKEN_PEEK=true (docker-compose.dev.yml defaults it on).'
    );
  }
}

async function main() {
  if (!process.argv.includes('--api-only')) {
    for (const [service, pkg, label] of BOOTSTRAP_TARGETS) {
      runBootstrap(service, pkg, label);
    }
  }

  process.stdout.write(`\n→ generating personas through the API (${API_URL})...\n`);
  await waitForGateway();
  await assertTokenPeekEnabled();
  const generator = createGenerator({
    baseUrl: API_URL,
    password: PASSWORD,
    log: line => process.stdout.write(`${line}\n`),
  });
  await generator.run(personas);
  process.stdout.write(
    '\n✓ seed complete — login as john.smith@gmail.com / DevPassword123! (or your SEED_PASSWORD)\n'
  );
}

main().catch(err => {
  process.stderr.write(`\n✗ seed failed: ${err.message}\n`);
  process.exitCode = 1;
});
