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
