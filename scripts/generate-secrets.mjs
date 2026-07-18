#!/usr/bin/env node
import { randomBytes } from 'node:crypto';

const b64 = (n = 32) => randomBytes(n).toString('base64');
// Hex is URL-safe (no + / =) — required for values interpolated into
// connection URLs such as DATABASE_URL / REDIS_URL.
const hex = (n = 24) => randomBytes(n).toString('hex');

/**
 * Returns a block of freshly-generated secret key=value lines suitable for
 * appending to a .env file.  Called by bootstrap.mjs on fresh .env creation
 * and by the standalone `pnpm secrets:generate` command.
 */
export function generateSecretsBlock() {
  return [
    '# Copy these into your .env file:',
    `JWT_SECRET=${b64()}`,
    `JWT_REFRESH_SECRET=${b64()}`,
    `SESSION_SECRET=${b64()}`,
    `ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`,
    `UPLOAD_SIGNING_SECRET=${b64()}`,
    `JWT_REPORT_SHARE_SECRET=${b64()}`,
    '# Infra passwords are interpolated into DATABASE_URL / REDIS_URL, so they',
    '# use hex (URL-safe) rather than base64. Regenerate if leaked:',
    `POSTGRES_PASSWORD=${hex(24)}`,
    `REDIS_PASSWORD=${hex(24)}`,
    // ADS-968: Grafana (docker-compose.yml `full`/`observability` profiles)
    // refuses to start without this — no more admin/admin default.
    `GF_SECURITY_ADMIN_PASSWORD=${hex(24)}`,
  ].join('\n');
}

// Thin wrapper — prints the block when run directly via `pnpm secrets:generate`.
console.log(generateSecretsBlock());
