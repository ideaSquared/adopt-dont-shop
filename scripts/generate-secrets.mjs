#!/usr/bin/env node
import { randomBytes } from 'node:crypto';

const b64 = (n = 32) => randomBytes(n).toString('base64');

/**
 * Returns a block of freshly-generated secret key=value lines suitable for
 * appending to a .env file.  Called by bootstrap.mjs on fresh .env creation
 * and by the standalone `npm run secrets:generate` command.
 */
export function generateSecretsBlock() {
  return [
    '# Copy these into your .env file:',
    `JWT_SECRET=${b64()}`,
    `JWT_REFRESH_SECRET=${b64()}`,
    `SESSION_SECRET=${b64()}`,
    `CSRF_SECRET=${b64()}`,
    `ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`,
    `UPLOAD_SIGNING_SECRET=${b64()}`,
    `JWT_REPORT_SHARE_SECRET=${b64()}`,
    '# POSTGRES_PASSWORD is sensitive too — regenerate if leaked:',
    `POSTGRES_PASSWORD=${b64(24)}`,
  ].join('\n');
}

// Thin wrapper — prints the block when run directly via `npm run secrets:generate`.
console.log(generateSecretsBlock());
