// Payload redaction for the audit write path.
//
// Layer-2 (audit_events) is the most sensitive, longest-retained store in
// the system. Producers supply a free-form `payload` blob; this helper
// strips well-known secret-shaped keys before the row lands on disk.
//
// Design mirrors packages/observability's SECRET_KEY_PATTERN (sentry.ts)
// but is extended to cover the full audit deny-list and is applied
// recursively through nested objects and arrays.
//
// Rules:
//   - Deny-list is matched case-insensitively as a substring, so
//     `passwordHash`, `ACCESS_TOKEN`, `x-api-key` all match.
//   - Matched key values are replaced with the string '[REDACTED]'.
//   - Input is NEVER mutated — a new structure is returned.
//   - null / undefined / primitives pass through unchanged.
//   - Arrays are walked element-by-element.
//
// Covered keys (must cover at least the keys listed in ADS-772):
//   password, token, accessToken, refreshToken, otp, secret,
//   authorization, cookie, apiKey
//
// The `token` substring covers accessToken and refreshToken, but they are
// also listed explicitly for clarity. `apiKey` / `api_key` / `api-key`
// all match because `apikey` appears as a substring when lowercased.

const REDACTED = '[REDACTED]';

// Case-insensitive substring matches. The pattern is designed to be
// broad (same strategy as observability's SECRET_KEY_PATTERN) so that
// variations like `passwordHash`, `bearer_token`, `x-api-key` are caught
// without needing an exhaustive list.
const SECRET_KEY_PATTERN = /password|token|secret|otp|authorization|cookie|api[_\-]?key/i;

const redactValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([k, v]) => {
      if (SECRET_KEY_PATTERN.test(k)) {
        return [k, REDACTED] as const;
      }
      return [k, redactValue(v)] as const;
    });
    return Object.fromEntries(entries);
  }
  return value;
};

// Redact secret-shaped keys from an arbitrary audit payload.
// Returns a new value — never mutates the input.
// Safe to call with undefined (returns undefined).
export const redactAuditPayload = (payload: unknown): unknown => redactValue(payload);
