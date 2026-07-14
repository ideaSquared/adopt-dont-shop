import { describe, expect, it } from 'vitest';

import {
  consumeBackupCode,
  generateBackupCodes,
  hashBackupCodes,
  normalizeBackupCode,
} from './backup-codes.js';

// A deterministic in-memory hasher — real bcrypt rounds would slow the
// suite down for no behavioural benefit; the "hashed:" prefix is enough
// to prove hash() and compare() are actually wired to each other and that
// nothing ever compares/stores the plaintext code.
const testHasher = {
  hash: (value: string) => Promise.resolve(`hashed:${value}`),
  compare: (value: string, hash: string) => Promise.resolve(hash === `hashed:${value}`),
};

describe('generateBackupCodes', () => {
  it('generates 10 unique, high-entropy codes by default', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);
    }
  });

  it('honours a custom count', () => {
    expect(generateBackupCodes(3)).toHaveLength(3);
  });
});

describe('normalizeBackupCode', () => {
  it('strips hyphens/whitespace and uppercases', () => {
    expect(normalizeBackupCode('abcd-efgh-ijkl-mnop')).toBe('ABCDEFGHIJKLMNOP');
    expect(normalizeBackupCode(' ABCD EFGH ')).toBe('ABCDEFGH');
  });
});

describe('hashBackupCodes', () => {
  it('hashes the NORMALIZED form of each code, never the raw display form', async () => {
    const codes = ['abcd-efgh-ijkl-mnop'];
    const hashes = await hashBackupCodes(testHasher, codes);
    expect(hashes).toEqual(['hashed:ABCDEFGHIJKLMNOP']);
  });
});

describe('consumeBackupCode', () => {
  it('matches a stored code and removes only that hash (single-use)', async () => {
    const codes = generateBackupCodes(3);
    const hashes = await hashBackupCodes(testHasher, codes);

    const result = await consumeBackupCode(testHasher, hashes, codes[1]);

    expect(result.ok).toBe(true);
    expect(result.remaining).toHaveLength(2);
    expect(result.remaining).not.toContain(hashes[1]);
    expect(result.remaining).toEqual([hashes[0], hashes[2]]);
  });

  it('accepts the code with or without hyphens', async () => {
    const codes = generateBackupCodes(1);
    const hashes = await hashBackupCodes(testHasher, codes);

    const result = await consumeBackupCode(
      testHasher,
      hashes,
      codes[0].replace(/-/g, '').toLowerCase()
    );

    expect(result.ok).toBe(true);
    expect(result.remaining).toHaveLength(0);
  });

  it('rejects a code that does not match any stored hash', async () => {
    const codes = generateBackupCodes(2);
    const hashes = await hashBackupCodes(testHasher, codes);

    const result = await consumeBackupCode(testHasher, hashes, 'ZZZZ-ZZZZ-ZZZZ-ZZZZ');

    expect(result.ok).toBe(false);
    expect(result.remaining).toEqual(hashes);
  });

  it('is single-use — the same code fails once its hash is removed', async () => {
    const codes = generateBackupCodes(2);
    const hashes = await hashBackupCodes(testHasher, codes);

    const first = await consumeBackupCode(testHasher, hashes, codes[0]);
    expect(first.ok).toBe(true);

    const second = await consumeBackupCode(testHasher, first.remaining, codes[0]);
    expect(second.ok).toBe(false);
    expect(second.remaining).toEqual(first.remaining);
  });

  it('rejects when there are no stored codes (null or empty)', async () => {
    expect((await consumeBackupCode(testHasher, null, 'ABCD-EFGH-IJKL-MNOP')).ok).toBe(false);
    expect((await consumeBackupCode(testHasher, [], 'ABCD-EFGH-IJKL-MNOP')).ok).toBe(false);
  });

  it('rejects an empty candidate', async () => {
    const codes = generateBackupCodes(1);
    const hashes = await hashBackupCodes(testHasher, codes);
    expect((await consumeBackupCode(testHasher, hashes, '')).ok).toBe(false);
  });
});
