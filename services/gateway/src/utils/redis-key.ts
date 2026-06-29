// Shared sanitization contract for building Redis keys from
// user-controlled or otherwise untrusted segments (ADS-880).
//
// Redis keys are colon-delimited by convention in this codebase
// (`prefix:bucket:value`). A segment containing a raw `:`, `\r`, or `\n`
// can fragment the key and let a crafted value collide with or escape its
// intended namespace. Pre-trusted segments (literal prefixes, numeric
// buckets) are validated as-is; values derived from request input must be
// hashed first via `hashKeyPart`.

import { createHash } from 'node:crypto';

const UNSAFE_KEY_CHARS = /[:\r\n]/;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Joins pre-sanitized segments into a single Redis key, rejecting any
// segment that could fragment or collide with a neighbouring key.
export const redisKey = (...parts: string[]): string => parts.map(assertSafeKeyPart).join(':');

const assertSafeKeyPart = (part: string): string => {
  if (UNSAFE_KEY_CHARS.test(part)) {
    throw new Error(`Unsafe Redis key segment: ${JSON.stringify(part)}`);
  }
  return part;
};

// Hashes an untrusted value (e.g. a user-supplied email) into a fixed-shape,
// always-safe key segment. Also avoids storing the raw value in Redis.
export const hashKeyPart = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

// Validates that a value used to key a Redis entry is a UUID, so a future
// change that takes the value from an untrusted source fails loudly rather
// than silently widening the key's input space.
export const assertUuid = (value: string): string => {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Expected a UUID, got: ${JSON.stringify(value)}`);
  }
  return value;
};
