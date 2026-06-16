// Recursive secret/PII redaction for log + telemetry payloads.
//
// Mirrors the audit-write redactor (packages/events/redact-audit-payload)
// and the Sentry beforeSend redactor (sentry.ts), kept in THIS package so
// the shared logger can redact without taking a dependency on
// packages/events (a lower-level package must not depend on a higher one).
//
// A key is redacted when its name matches SECRET_KEY_PATTERN (case-
// insensitive substring), so `passwordHash`, `ACCESS_TOKEN`, `x-api-key`,
// `Set-Cookie` and `otp` all match. Values are walked recursively through
// nested objects and arrays. The input is never mutated — a new structure
// is returned.

export const REDACTED = '[REDACTED]';

// Broad on purpose (same strategy as the audit deny-list) so variants like
// `passwordHash`, `bearer_token`, `x-api-key`, `Set-Cookie` are caught
// without an exhaustive list.
export const SECRET_KEY_PATTERN = /password|token|secret|otp|authorization|cookie|api[_-]?key/i;

export const redactSecretFields = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactSecretFields);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        SECRET_KEY_PATTERN.test(k)
          ? ([k, REDACTED] as const)
          : ([k, redactSecretFields(v)] as const)
      )
    );
  }
  return value;
};
