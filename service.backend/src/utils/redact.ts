/**
 * Sensitive field redaction.
 *
 * Two redactors with different scopes:
 *
 * - `redactSensitiveFields` redacts credentials (password, token, secret).
 *   Used at audit-log call sites where the audit DB is a controlled-access
 *   sink that legitimately keeps email and other identifiers.
 *
 * - `redactLogPayload` extends the credential set with `email` because logs
 *   are scraped by aggregators / shipped to third-party error trackers and
 *   should not carry user PII (ADS-407, ADS-445/459). Wired into the
 *   Winston format chain so every log line is sanitised by default.
 *
 * Both match by lowercase substring so variants (`passwordHash`,
 * `resetToken`, `apiSecret`, `userEmail`) are all caught.
 */
const CREDENTIAL_KEY_PATTERNS = ['password', 'token', 'secret'] as const;
const LOG_KEY_PATTERNS = [...CREDENTIAL_KEY_PATTERNS, 'email'] as const;

const REDACTED = '[REDACTED]';

const matchesAny = (key: string, patterns: readonly string[]): boolean => {
  const lower = key.toLowerCase();
  return patterns.some(pattern => lower.includes(pattern));
};

const redactBy = <T>(value: T, patterns: readonly string[]): T => {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => redactBy(item, patterns)) as unknown as T;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => {
      if (matchesAny(k, patterns)) {
        return [k, REDACTED];
      }
      return [k, redactBy(v, patterns)];
    });
    return Object.fromEntries(entries) as T;
  }
  return value;
};

/**
 * Redact credential-like fields (password, token, secret). Safe for audit
 * log payloads.
 */
export const redactSensitiveFields = <T>(value: T): T => redactBy(value, CREDENTIAL_KEY_PATTERNS);

/**
 * Redact credential and PII fields (adds `email` to the credential set).
 * Use for log output only — audit trails should keep emails for forensic
 * traceability.
 */
export const redactLogPayload = <T>(value: T): T => redactBy(value, LOG_KEY_PATTERNS);
