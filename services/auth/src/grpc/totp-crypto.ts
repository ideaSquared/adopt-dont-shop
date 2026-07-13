// AES-256-GCM helpers for encrypting TOTP secrets at rest (ADS-914a).
//
// `two_factor_secret` used to be written and read verbatim — a single DB
// read yielded a permanent, offline 2FA bypass for every enrolled user.
// Encrypt/decrypt with the service's ENCRYPTION_KEY (config.encryptionKey,
// 64 hex chars / 32 bytes) so a DB compromise alone isn't enough.
//
// Encoding: base64(iv[12] || authTag[16] || ciphertext). IV is random per
// call (GCM requires a unique IV per encryption under the same key); the
// auth tag detects tampering/corruption on decrypt.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function keyFromHex(encryptionKeyHex: string): Buffer {
  return Buffer.from(encryptionKeyHex, 'hex');
}

export function encryptTotpSecret(encryptionKeyHex: string, plaintext: string): string {
  const key = keyFromHex(encryptionKeyHex);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

// Throws if `encoded` is malformed or fails GCM auth-tag verification
// (tampered/corrupted ciphertext, or wrong key).
export function decryptTotpSecret(encryptionKeyHex: string, encoded: string): string {
  const key = keyFromHex(encryptionKeyHex);
  const raw = Buffer.from(encoded, 'base64');
  if (raw.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('encrypted TOTP secret is malformed');
  }
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
