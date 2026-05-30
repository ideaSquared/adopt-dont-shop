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

// ADS-784: cap recursion depth and guard against cycles so a deeply-nested or
// self-referential payload can't blow the stack / loop forever when a log line
// or audit entry is sanitised.
const MAX_DEPTH = 10;
const TRUNCATED = '[TRUNCATED]';
const CIRCULAR = '[CIRCULAR]';

const redactByInner = <T>(
  value: T,
  patterns: readonly string[],
  depth: number,
  seen: WeakSet<object>
): T => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_DEPTH) {
    return TRUNCATED as unknown as T;
  }
  if (seen.has(value as object)) {
    return CIRCULAR as unknown as T;
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map(item => redactByInner(item, patterns, depth + 1, seen)) as unknown as T;
  }
  const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => {
    if (matchesAny(k, patterns)) {
      return [k, REDACTED];
    }
    return [k, redactByInner(v, patterns, depth + 1, seen)];
  });
  return Object.fromEntries(entries) as T;
};

const redactBy = <T>(value: T, patterns: readonly string[]): T =>
  redactByInner(value, patterns, 0, new WeakSet<object>());

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
