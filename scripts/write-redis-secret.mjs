#!/usr/bin/env node
// Materialises ./secrets/redis_password from .env's REDIS_PASSWORD.
//
// The `redis` service in docker-compose.yml reads its --requirepass value
// from this file-mounted secret instead of `environment:` (ADS-878), so it
// must exist before `docker compose up redis` runs. Shared by
// `pnpm docker:dev` (via docker-dev.mjs's fuller preflight) and
// `pnpm dev:services`, which calls `docker compose up -d database redis`
// directly and so needs this step run first.
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function writeRedisPasswordSecret() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) {
    throw new Error('.env not found. Run `pnpm bootstrap` (or copy .env.example) first.');
  }
  const contents = readFileSync(envPath, 'utf8');
  const password = (contents.match(/^REDIS_PASSWORD=(.*)$/m) || [])[1]?.trim();
  if (!password) {
    throw new Error('.env missing a value for REDIS_PASSWORD. Run `pnpm secrets:generate`.');
  }
  const secretsDir = join(ROOT, 'secrets');
  if (!existsSync(secretsDir)) mkdirSync(secretsDir, { mode: 0o700 });
  // Belt-and-braces: a dir left over from before this fix may still be 0755.
  chmodSync(secretsDir, 0o700);
  const secretPath = join(secretsDir, 'redis_password');
  writeFileSync(secretPath, password, { mode: 0o600 });
  // Belt-and-braces: writeFileSync's mode option is masked by umask on some
  // filesystems, so explicitly chmod after write. [ADS-933]
  chmodSync(secretPath, 0o600);
  return password;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    writeRedisPasswordSecret();
    console.log('secrets/redis_password written');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
