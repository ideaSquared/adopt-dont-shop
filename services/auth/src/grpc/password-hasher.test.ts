import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';

import { createBcryptPasswordHasher } from './password-hasher.js';

// Use cost 4 (the lowest bcrypt allows) so the test stays under ~30ms
// per hash. Production hashes are written by the monolith at cost 10+
// and this hasher only ever READS them.
const fastHash = (s: string) => bcrypt.hash(s, 4);

describe('createBcryptPasswordHasher', () => {
  it('returns true when the password matches the hash', async () => {
    const hasher = createBcryptPasswordHasher();
    const hash = await fastHash('hunter2');
    expect(await hasher.compare('hunter2', hash)).toBe(true);
  });

  it('returns false when the password does not match', async () => {
    const hasher = createBcryptPasswordHasher();
    const hash = await fastHash('hunter2');
    expect(await hasher.compare('wrong', hash)).toBe(false);
  });

  it('hash() produces a string that the same hasher can compare()', async () => {
    const hasher = createBcryptPasswordHasher();
    const hash = await hasher.hash('hunter2');
    expect(typeof hash).toBe('string');
    expect(hash.startsWith('$2')).toBe(true); // bcrypt format
    expect(await hasher.compare('hunter2', hash)).toBe(true);
    expect(await hasher.compare('wrong', hash)).toBe(false);
  }, 10_000); // cost 12 → ~250ms per hash; give it plenty of headroom
});
