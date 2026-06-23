#!/usr/bin/env node
// Materialises ./secrets/redis_password from .env's REDIS_PASSWORD.
//
// The `redis` service in docker-compose.yml reads its --requirepass value
// from this file-mounted secret instead of `environment:` (ADS-878), so it
// must exist before `docker compose up redis` runs. Shared by
// `pnpm docker:dev` (via docker-dev.mjs's fuller preflight) and
// `pnpm dev:services`, which calls `docker compose up -d database redis`
// directly and so needs this step run first.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function writeRedisPasswordSecret() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) {
    throw new Error('.env not found. Run `pnpm setup` (or copy .env.example) first.');
  }
  const contents = readFileSync(envPath, 'utf8');
  const password = (contents.match(/^REDIS_PASSWORD=(.*)$/m) || [])[1]?.trim();
  if (!password) {
    throw new Error('.env missing a value for REDIS_PASSWORD. Run `pnpm secrets:generate`.');
  }
  const secretsDir = join(ROOT, 'secrets');
  if (!existsSync(secretsDir)) mkdirSync(secretsDir);
  writeFileSync(join(secretsDir, 'redis_password'), password);
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
