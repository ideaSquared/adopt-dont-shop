#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const b64 = (n = 32) => randomBytes(n).toString('base64');
// Hex is URL-safe (no + / =) — required for values interpolated into
// connection URLs such as DATABASE_URL / REDIS_URL.
const hex = (n = 24) => randomBytes(n).toString('hex');

/**
 * Canonical list of secret keys generated for a fresh .env. This is the
 * single source of truth — bootstrap.mjs imports SECRET_KEYS and
 * generateSecret() from here so both onboarding paths (`pnpm bootstrap` and
 * the standalone `pnpm secrets:generate`) produce the same set of secrets.
 */
export const SECRET_KEYS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  'UPLOAD_SIGNING_SECRET',
  'JWT_REPORT_SHARE_SECRET',
  'POSTGRES_PASSWORD',
  'REDIS_PASSWORD',
  'GF_SECURITY_ADMIN_PASSWORD',
];

/**
 * Generates a value for a single secret key, using the byte length/encoding
 * appropriate to that key.
 */
export function generateSecret(key) {
  if (key === 'ENCRYPTION_KEY') {
    // AES-256 needs exactly 32 bytes (64 hex chars).
    return randomBytes(32).toString('hex');
  }
  if (key === 'POSTGRES_PASSWORD' || key === 'REDIS_PASSWORD') {
    // These are interpolated into connection URLs (DATABASE_URL / REDIS_URL),
    // so use hex — base64 can contain + / = which break URL parsing.
    return hex(24);
  }
  return b64();
}

/**
 * Returns a block of freshly-generated secret key=value lines suitable for
 * appending to a .env file. Used by bootstrap.mjs (via SECRET_KEYS /
 * generateSecret) on fresh .env creation, and printed directly by the
 * standalone `pnpm secrets:generate` command below.
 */
export function generateSecretsBlock() {
  return [
    '# Copy these into your .env file:',
    `JWT_SECRET=${generateSecret('JWT_SECRET')}`,
    `JWT_REFRESH_SECRET=${generateSecret('JWT_REFRESH_SECRET')}`,
    `SESSION_SECRET=${generateSecret('SESSION_SECRET')}`,
    `ENCRYPTION_KEY=${generateSecret('ENCRYPTION_KEY')}`,
    `UPLOAD_SIGNING_SECRET=${generateSecret('UPLOAD_SIGNING_SECRET')}`,
    `JWT_REPORT_SHARE_SECRET=${generateSecret('JWT_REPORT_SHARE_SECRET')}`,
    '# Infra passwords are interpolated into DATABASE_URL / REDIS_URL, so they',
    '# use hex (URL-safe) rather than base64. Regenerate if leaked:',
    `POSTGRES_PASSWORD=${generateSecret('POSTGRES_PASSWORD')}`,
    `REDIS_PASSWORD=${generateSecret('REDIS_PASSWORD')}`,
    // ADS-968: Grafana (docker-compose.yml `full`/`observability` profiles)
    // refuses to start without this — no more admin/admin default.
    `GF_SECURITY_ADMIN_PASSWORD=${generateSecret('GF_SECURITY_ADMIN_PASSWORD')}`,
  ].join('\n');
}

// Thin wrapper — prints the block only when run directly via `pnpm secrets:generate`,
// not when imported (e.g. by bootstrap.mjs for SECRET_KEYS/generateSecret).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(generateSecretsBlock());
}
