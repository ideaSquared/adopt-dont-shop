#!/usr/bin/env node
/**
 * Dev-only bulk-data ('spam') orchestrator.
 *
 * Floods the running docker-compose stack with faker-generated volume so dev
 * looks like a populated production environment. This is the heavy counterpart
 * to scripts/seed.mjs (which only plants a small fixed persona set). It runs
 * each owning service's `db:spam` script in dependency order:
 *
 *   1. service-auth          — adopters + rescue staff
 *   2. service-rescue        — rescues + staff_member links (reads auth ids)
 *   3. service-pets          — pets + ratings (reads rescue/auth ids)
 *   4. service-applications  — applications (reads auth/pet/rescue ids)
 *   5. service-chat          — chats + participants + messages (reads app ids)
 *   6. service-notifications — in-app notifications (reads auth ids)
 *
 * Like seed.mjs this is a HOST-side orchestrator: it spawns `docker compose
 * exec`, delegating the work to the per-service tsx scripts INSIDE each
 * container (where DATABASE_URL + the workspace are wired up). Each per-service
 * script is double-gated by assertSpamAllowed (NODE_ENV + ALLOW_SPAM), so we
 * pass NODE_ENV=development and ALLOW_SPAM=true into the exec environment.
 *
 * ADDITIVE: every run inserts fresh random-UUID rows. Re-running adds MORE
 * data — it does not upsert. Wipe with `pnpm docker:reset`.
 *
 * Volume is overridable per entity via SPAM_* env vars, forwarded to the
 * containers (e.g. SPAM_PETS=1000 pnpm db:spam). Faker text is seeded
 * (FAKER_SEED) so generated names/descriptions are reproducible.
 *
 *   pnpm docker:dev:detach   # stack must be up
 *   pnpm db:spam
 */
import { spawnSync } from 'node:child_process';

const DOCKER = process.env.SEED_DOCKER ?? 'docker';

// SPAM_* volume knobs + the faker seed are forwarded into each container.
const FORWARDED_ENV = [
  'SPAM_ADOPTERS',
  'SPAM_STAFF',
  'SPAM_RESCUES',
  'SPAM_PETS',
  'SPAM_RATINGS',
  'SPAM_APPLICATIONS',
  'SPAM_CHATS',
  'SPAM_MESSAGES',
  'SPAM_NOTIFICATIONS',
  'SPAM_PASSWORD',
  'FAKER_SEED',
];

// [compose service name, workspace package, label] in dependency order. The
// --filter pins `pnpm run db:spam` to the service's own script (containers run
// with working_dir=/app, so a bare run would resolve the root script instead).
const SPAM_TARGETS = [
  ['service-auth', '@adopt-dont-shop/service.auth', 'adopters + staff'],
  ['service-rescue', '@adopt-dont-shop/service.rescue', 'rescues + staff links'],
  ['service-pets', '@adopt-dont-shop/service.pets', 'pets + ratings'],
  ['service-applications', '@adopt-dont-shop/service.applications', 'applications'],
  ['service-chat', '@adopt-dont-shop/service.chat', 'chats + messages'],
  ['service-notifications', '@adopt-dont-shop/service.notifications', 'notifications'],
];

const forwardedEnvFlags = () =>
  FORWARDED_ENV.filter(name => process.env[name] !== undefined).flatMap(name => [
    '-e',
    `${name}=${process.env[name]}`,
  ]);

function runSpam(service, pkg, label) {
  process.stdout.write(`\n→ spamming ${label} (${service})...\n`);
  const result = spawnSync(
    DOCKER,
    [
      'compose',
      'exec',
      '-T',
      '-e',
      'NODE_ENV=development',
      '-e',
      'ALLOW_SPAM=true',
      ...forwardedEnvFlags(),
      service,
      'pnpm',
      '--filter',
      pkg,
      'run',
      'db:spam',
    ],
    { stdio: 'inherit' }
  );
  if (result.error) {
    throw new Error(
      `failed to exec into ${service}: ${result.error.message}. ` +
        `Is the stack running? Try 'pnpm docker:dev:detach' first.`
    );
  }
  if (result.status !== 0) {
    throw new Error(`spam for ${service} exited with code ${result.status}`);
  }
}

function main() {
  for (const [service, pkg, label] of SPAM_TARGETS) {
    runSpam(service, pkg, label);
  }
  process.stdout.write('\n✓ spam complete — dev database flooded with faker volume.\n');
  process.stdout.write('  Log in as any spam user: <name>@example.test / DevPassword123!\n');
}

main();
