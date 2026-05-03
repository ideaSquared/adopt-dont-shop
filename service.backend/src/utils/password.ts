import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);

if (!Number.isFinite(BCRYPT_ROUNDS) || BCRYPT_ROUNDS < 10) {
  throw new Error('BCRYPT_ROUNDS must be an integer >= 10');
}

export const hashPassword = async (plaintext: string): Promise<string> => {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(plaintext, salt);
};

export const verifyPassword = (plaintext: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plaintext, hash);
