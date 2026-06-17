#!/usr/bin/env node
/**
 * Dev/e2e seed orchestrator.
 *
 * Runs each owning service's `db:seed` script in dependency order against
 * the running docker-compose stack:
 *
 *   1. service-auth   — canonical personas (john.smith + admin + rescue staff)
 *   2. service-rescue — rescue orgs + staff_member links (reference auth ids)
 *   3. service-pets   — pet catalogue (reference rescue ids)
 *
 * This is a HOST-side orchestrator: it must NOT import any
 * @adopt-dont-shop/* workspace package (CAD lesson — host scripts that pull
 * in workspace code break when run outside the container's module graph).
 * It only spawns `docker compose exec`, delegating the actual seeding to the
 * per-service tsx scripts that run INSIDE each container (where DATABASE_URL
 * and the workspace are already wired up).
 *
 * Idempotent: every per-service seed uses ON CONFLICT DO UPDATE, so this is
 * safe to re-run. Run it after the stack is up:
 *
 *   pnpm docker:dev:detach   # or docker:dev in another terminal
 *   pnpm db:seed
 *
 * Override the compose service names or the docker binary via env if your
 * topology differs (SEED_DOCKER, SEED_COMPOSE_FILE).
 */
import { spawnSync } from 'node:child_process';

const DOCKER = process.env.SEED_DOCKER ?? 'docker';

// [compose service name, the package the seed lives in] in run order.
const SEED_TARGETS = [
  ['service-auth', 'auth users (personas)'],
  ['service-rescue', 'rescues + staff'],
  ['service-pets', 'pet catalogue'],
  ['service-applications', 'application read-model (references user/pet/rescue ids)'],
];

function runSeed(service, label) {
  process.stdout.write(`\n→ seeding ${label} (${service})...\n`);
  const result = spawnSync(DOCKER, ['compose', 'exec', '-T', service, 'pnpm', 'run', 'db:seed'], {
    stdio: 'inherit',
  });
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

function main() {
  for (const [service, label] of SEED_TARGETS) {
    runSeed(service, label);
  }
  process.stdout.write('\n✓ seed complete — login as john.smith@gmail.com / DevPassword123!\n');
}

main();
