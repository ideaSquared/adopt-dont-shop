#!/usr/bin/env node
/**
 * Guard: every variable that `scripts/validate-env.ts` marks as required
 * for development must be mentioned in the REQUIRED banner block at the top
 * of `.env.example`. Stops contributors from adding a hard-required var to
 * the validator without surfacing it in the onboarding file.
 *
 * Exits non-zero if any required var is missing from the REQUIRED banner.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.dirname(__dirname);

// Keep this list in sync with the required fields in
// packages/lib.validation/src/schemas/env.ts (envBaseSchema) and the per-env
// dbName checks consumed by scripts/validate-env.ts.
const REQUIRED_KEYS = [
  'NODE_ENV',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DEV_DB_NAME',
  'TEST_DB_NAME',
  'PROD_DB_NAME',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
];

const examplePath = path.join(rootDir, '.env.example');
const content = fs.readFileSync(examplePath, 'utf8');

const requiredMatch = content.match(
  /# REQUIRED — must be set[\s\S]*?# OPTIONAL — change only if you know why/
);
if (!requiredMatch) {
  console.error(
    'check-env-example: .env.example is missing the REQUIRED ... OPTIONAL banner block.'
  );
  process.exit(1);
}

const banner = requiredMatch[0];
const missing = REQUIRED_KEYS.filter(key => !banner.includes(key));

if (missing.length > 0) {
  console.error('check-env-example: required vars missing from REQUIRED banner in .env.example:');
  for (const key of missing) {
    console.error(`  - ${key}`);
  }
  console.error('\nAdd them to the banner block at the top of .env.example.');
  process.exit(1);
}

console.info('check-env-example: REQUIRED banner lists all required vars ✓');
