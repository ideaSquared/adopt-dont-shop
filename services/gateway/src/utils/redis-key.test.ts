import { describe, expect, it } from 'vitest';

import { assertUuid, hashKeyPart, redisKey } from './redis-key.js';

describe('redisKey', () => {
  it('joins safe segments with a colon', () => {
    expect(redisKey('auth-email-rl', '123', 'abc')).toBe('auth-email-rl:123:abc');
  });

  it('rejects a segment containing a colon', () => {
    expect(() => redisKey('prefix', 'a:b')).toThrow(/Unsafe Redis key segment/);
  });

  it('rejects a segment containing a newline or carriage return', () => {
    expect(() => redisKey('prefix', 'a\nb')).toThrow(/Unsafe Redis key segment/);
    expect(() => redisKey('prefix', 'a\rb')).toThrow(/Unsafe Redis key segment/);
  });
});

describe('hashKeyPart', () => {
  it('returns a stable SHA-256 hex digest', () => {
    const hash = hashKeyPart('alex@example.com');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashKeyPart('alex@example.com')).toBe(hash);
  });

  it('produces different digests for different inputs', () => {
    expect(hashKeyPart('a@example.com')).not.toBe(hashKeyPart('b@example.com'));
  });

  it('never contains characters that could fragment a Redis key', () => {
    const hash = hashKeyPart('attacker:1\r\nINJECTED');
    expect(redisKey('prefix', hash)).toBe(`prefix:${hash}`);
  });
});

describe('assertUuid', () => {
  it('returns the value when it is a valid UUID', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(assertUuid(id)).toBe(id);
  });

  it('throws for a non-UUID value', () => {
    expect(() => assertUuid('not-a-uuid')).toThrow(/Expected a UUID/);
  });

  it('throws for a value smuggling Redis key delimiters', () => {
    expect(() => assertUuid('abc:1\r\nINJECTED')).toThrow(/Expected a UUID/);
  });
});
