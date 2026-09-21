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
//
// PII-shaped keys (ADS-1344) are a separate pattern/pass: a PII value is
// MASKED (see maskPiiValue) rather than dropped wholesale, because a
// partial value (e.g. `j***@example.com`) is still useful for debugging —
// mirrors services/notifications' maskRecipient (ADS-1257). This does not
// change redactSecretFields' own behaviour; the logger composes both
// passes (see logger.ts's redactingFormat).

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

// Broad on purpose, same strategy as SECRET_KEY_PATTERN: `name` alone
// already matches `firstName`, `lastName`, `fullName`, `userName`, etc. as
// a substring, so those aren't listed separately. `postcode`/`postalcode`
// are both listed because neither is a substring of the other (rescues use
// `postcode`, users use `postalCode`).
export const PII_KEY_PATTERN =
  /email|phone|mobile|address|postcode|postalcode|name|date[_-]?of[_-]?birth/i;

// Partially mask a single PII-shaped value so a log line stays useful for
// debugging — mirrors services/notifications' maskRecipient (ADS-1257): an
// email keeps its first local-part character plus the domain; any other
// string keeps only its first character. The mask is a fixed-length run of
// asterisks, so it never reveals the original value's length. A value that
// isn't a string (a nested object, an array, a number) can't be partially
// masked usefully, so it's dropped wholesale, like a secret.
export const maskPiiValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== 'string') {
    return REDACTED;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  const at = trimmed.lastIndexOf('@');
  if (at > 0) {
    return `${trimmed.slice(0, 1)}***@${trimmed.slice(at + 1)}`;
  }
  return `${trimmed.slice(0, 1)}***`;
};

// Same recursive shape as redactSecretFields, but for PII: a matched key's
// value is masked (see maskPiiValue) instead of replaced outright, and
// non-matching values are walked recursively. Does not itself consider
// SECRET_KEY_PATTERN — the logger composes this with redactSecretFields.
export const maskPiiFields = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(maskPiiFields);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        PII_KEY_PATTERN.test(k) ? ([k, maskPiiValue(v)] as const) : ([k, maskPiiFields(v)] as const)
      )
    );
  }
  return value;
};

// Path segments that carry a secret directly in the URL (not a query
// param) — the segment immediately after the prefix is replaced with
// REDACTED rather than the whole path, so the route is still visible in
// logs. `/uploads-signed/:expiresAt/:signature/*` (services/gateway/src/
// routes/uploads.ts) puts an HMAC signature at this position.
const SENSITIVE_PATH_PREFIXES = ['/uploads-signed/'];

// Strips a URL down to something safe to put in a Loki log line:
//   - the query string is dropped entirely (ADS-972) — redactSecretFields
//     only redacts by object key, so a token/signature passed as
//     `?token=...` would otherwise round-trip into logs verbatim.
//   - known secret-bearing path segments (signed-upload signatures) are
//     replaced with REDACTED.
// Method + route pattern are still logged separately by call sites, so
// this only needs to keep the path segment itself safe.
export const redactUrl = (url: string): string => {
  const path = url.split('?')[0] ?? '';
  for (const prefix of SENSITIVE_PATH_PREFIXES) {
    if (path.startsWith(prefix)) {
      return `${prefix}${REDACTED}`;
    }
  }
  return path;
};
