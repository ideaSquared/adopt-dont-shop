import {
  decryptSecret,
  encryptSecret,
  hashBackupCode,
  hashToken,
  verifyBackupCode,
} from '../../utils/secrets';

describe('secrets util', () => {
  describe('hashToken', () => {
    it('produces a deterministic 64-char hex hash', () => {
      const token = 'abc123';
      const hash = hashToken(token);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hashToken(token)).toBe(hash);
    });

    it('different inputs produce different hashes', () => {
      expect(hashToken('a')).not.toBe(hashToken('b'));
    });

    it('hash comparison enables lookup-by-raw-token', () => {
      // Pattern used by auth.service.verifyEmail / confirmPasswordReset:
      // caller emails the raw token; DB holds the hash; lookup hashes the
      // incoming token and does equality.
      const rawFromEmail = 'f'.repeat(64);
      const stored = hashToken(rawFromEmail);
      expect(hashToken(rawFromEmail)).toBe(stored);
    });
  });

  describe('hashBackupCode / verifyBackupCode', () => {
    it('verify returns true for correct code and false otherwise', async () => {
      const hash = await hashBackupCode('abcd1234');
      expect(await verifyBackupCode('abcd1234', hash)).toBe(true);
      expect(await verifyBackupCode('wrong', hash)).toBe(false);
    });

    it('each hash of the same code is different (salted)', async () => {
      const h1 = await hashBackupCode('abcd1234');
      const h2 = await hashBackupCode('abcd1234');
      expect(h1).not.toBe(h2);
      expect(await verifyBackupCode('abcd1234', h1)).toBe(true);
      expect(await verifyBackupCode('abcd1234', h2)).toBe(true);
    });
  });

  describe('encryptSecret / decryptSecret', () => {
    it('round-trips plaintext through encrypt -> decrypt', () => {
      const secret = 'JBSWY3DPEHPK3PXP'; // typical base32 TOTP secret
      const encrypted = encryptSecret(secret);
      expect(encrypted).not.toBe(secret);
      expect(decryptSecret(encrypted)).toBe(secret);
    });

    it('each encryption yields a different ciphertext (random IV)', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const a = encryptSecret(secret);
      const b = encryptSecret(secret);
      expect(a).not.toBe(b);
      expect(decryptSecret(a)).toBe(secret);
      expect(decryptSecret(b)).toBe(secret);
    });

    it('tampering with ciphertext fails auth tag verification', () => {
      const encrypted = encryptSecret('JBSWY3DPEHPK3PXP');
      // flip one base64 char in the ciphertext region (beyond the first 28 bytes = IV+tag)
      const tampered =
        encrypted.slice(0, -2) + (encrypted.at(-2) === 'A' ? 'B' : 'A') + encrypted.at(-1);
      expect(() => decryptSecret(tampered)).toThrow();
    });
  });
});
