import { vi, describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

import { hashPassword, verifyPassword } from './password';

const mockedBcrypt = vi.mocked(bcrypt);

describe('password utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashPassword - securing user passwords for storage', () => {
    it('should generate a salt using 12 rounds by default', async () => {
      mockedBcrypt.genSalt.mockResolvedValue('salt' as never);
      mockedBcrypt.hash.mockResolvedValue('hashed' as never);

      await hashPassword('my-secret-password');

      expect(mockedBcrypt.genSalt).toHaveBeenCalledWith(12);
    });

    it('should return the bcrypt hash of the plaintext password', async () => {
      mockedBcrypt.genSalt.mockResolvedValue('salt' as never);
      mockedBcrypt.hash.mockResolvedValue('$2b$12$hashed-value' as never);

      const result = await hashPassword('my-secret-password');

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('my-secret-password', 'salt');
      expect(result).toBe('$2b$12$hashed-value');
    });
  });

  describe('verifyPassword - authenticating a user password attempt', () => {
    it('should return true when the plaintext matches the stored hash', async () => {
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await verifyPassword('correct-password', '$2b$12$hashed-value');

      expect(mockedBcrypt.compare).toHaveBeenCalledWith('correct-password', '$2b$12$hashed-value');
      expect(result).toBe(true);
    });

    it('should return false when the plaintext does not match the stored hash', async () => {
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await verifyPassword('wrong-password', '$2b$12$hashed-value');

      expect(result).toBe(false);
    });
  });
});

// ADS-619: regression test — bcrypt-2b hashes (previously produced by the native
// `bcrypt` package) must still validate via `bcryptjs.compare()` after the
// consolidation. This guards against the worst-case migration failure: existing
// seeded / production users being unable to log in.
describe('ADS-619 bcrypt → bcryptjs wire-compatibility', () => {
  // Pre-computed $2b$ hash (cost factor 10) of the plaintext "DevPassword123!"
  // produced by the native `bcrypt` package. bcrypt-2b is a documented wire
  // format; bcryptjs reads and verifies it without modification.
  const plaintext = 'DevPassword123!';
  const nativeBcryptHash = '$2b$10$kCjg03m18/TbEiEETpSGN.qJCR1I027RlNDut8PckwBhEuBi2sQQa';

  it('verifies a native-bcrypt-generated 2b hash via bcryptjs.compare()', async () => {
    // Bypass the global bcryptjs mock from setup-tests.ts so we exercise the
    // real implementation. Top-level import keeps the existing mocked path
    // working for the suite above.
    const realBcrypt = await vi.importActual<typeof import('bcryptjs')>('bcryptjs');

    const matches = await realBcrypt.compare(plaintext, nativeBcryptHash);
    expect(matches).toBe(true);

    const noMatch = await realBcrypt.compare('wrong-password', nativeBcryptHash);
    expect(noMatch).toBe(false);
  });

  it('round-trips a bcryptjs-generated hash back through bcryptjs.compare()', async () => {
    const realBcrypt = await vi.importActual<typeof import('bcryptjs')>('bcryptjs');

    const salt = await realBcrypt.genSalt(4); // low cost keeps the test fast
    const hash = await realBcrypt.hash(plaintext, salt);

    expect(hash.startsWith('$2')).toBe(true);
    expect(await realBcrypt.compare(plaintext, hash)).toBe(true);
  });
});
