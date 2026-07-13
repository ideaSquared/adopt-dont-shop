import { describe, expect, it } from 'vitest';

import { decryptTotpSecret, encryptTotpSecret } from './totp-crypto.js';

const KEY_A = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);

describe('encryptTotpSecret / decryptTotpSecret', () => {
  it('round-trips a TOTP secret through encrypt then decrypt', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptTotpSecret(KEY_A, secret);
    expect(decryptTotpSecret(KEY_A, encrypted)).toBe(secret);
  });

  it('never stores the plaintext secret in the encrypted output', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptTotpSecret(KEY_A, secret);
    expect(encrypted).not.toContain(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const first = encryptTotpSecret(KEY_A, secret);
    const second = encryptTotpSecret(KEY_A, secret);
    expect(first).not.toBe(second);
    expect(decryptTotpSecret(KEY_A, first)).toBe(secret);
    expect(decryptTotpSecret(KEY_A, second)).toBe(secret);
  });

  it('fails to decrypt with the wrong key', () => {
    const encrypted = encryptTotpSecret(KEY_A, 'JBSWY3DPEHPK3PXP');
    expect(() => decryptTotpSecret(KEY_B, encrypted)).toThrow();
  });

  it('fails to decrypt tampered ciphertext', () => {
    const encrypted = encryptTotpSecret(KEY_A, 'JBSWY3DPEHPK3PXP');
    const raw = Buffer.from(encrypted, 'base64');
    raw[raw.length - 1] = raw[raw.length - 1] ^ 0xff;
    expect(() => decryptTotpSecret(KEY_A, raw.toString('base64'))).toThrow();
  });

  it('fails to decrypt a malformed (too-short) value', () => {
    expect(() => decryptTotpSecret(KEY_A, Buffer.from('short').toString('base64'))).toThrow(
      /malformed/
    );
  });
});
