import crypto from 'crypto';

/**
 * ADS-407 / ADS-494: log-safe email redaction.
 *
 * Logs are a controlled-access PII sink under GDPR/UK regulators — emails
 * shouldn't appear in plaintext in structured log output. This helper
 * returns a deterministic, low-collision identifier so operators can still
 * correlate log lines for a single account without seeing the address.
 *
 * Format: `<localPrefix>***@<domain>#<hash8>` where:
 *   - `localPrefix` is up to 2 chars of the local-part (or `*` if empty)
 *   - `domain` is preserved (small leakage; matches what most error
 *     trackers like Sentry already retain via referrer host)
 *   - `hash8` is the first 8 hex chars of SHA-256(emailLowercased)
 *     so two redactions of the same email collide deterministically.
 *
 * Use at every `logger.*({ email })` call site in auth.service.ts.
 */
const hashPrefix = (input: string): string => {
  const fn = (crypto as { createHash?: typeof crypto.createHash }).createHash;
  if (typeof fn !== 'function') {
    return '00000000';
  }
  try {
    return fn('sha256').update(input).digest('hex').slice(0, 8);
  } catch {
    return '00000000';
  }
};

export const redactEmail = (email: string | null | undefined): string => {
  if (!email || typeof email !== 'string') {
    return 'unknown';
  }

  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  const hash8 = hashPrefix(trimmed);

  if (atIndex < 1) {
    return `invalid#${hash8}`;
  }

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  const prefix = local.slice(0, 2) || '*';
  return `${prefix}***@${domain}#${hash8}`;
};
