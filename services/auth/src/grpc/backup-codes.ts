// 2FA backup/recovery codes (ADS-914b) — self-service recovery when a user
// loses their authenticator. Minted on EnableTwoFactor and
// RegenerateBackupCodes, shown to the client in PLAINTEXT exactly once;
// only bcrypt hashes are ever persisted (auth.users.backup_codes, text[]).
//
// Format: each code is 10 random bytes from otplib's CSPRNG (the same
// crypto plugin already trusted for TOTP secrets — see totp-crypto.ts),
// base32-encoded (16 chars, no padding) and displayed as four
// hyphen-separated groups of four for readability, e.g.
// "ABCD-EFGH-IJKL-MNOP". Comparison normalises away the hyphens/whitespace
// and uppercases, so a user can paste either form back in.

import { generateSecret } from 'otplib';

import type { PasswordHasher } from './handlers.js';

const BACKUP_CODE_COUNT = 10;
// 10 bytes -> 16 base32 chars (80 bits / 5 bits-per-char, no padding).
const BACKUP_CODE_BYTES = 10;

function formatBackupCode(raw: string): string {
  return raw.match(/.{1,4}/g)?.join('-') ?? raw;
}

// Strips everything but the base32 alphabet and uppercases, so
// "abcd-efgh-ijkl-mnop" and "ABCDEFGHIJKLMNOP" compare equal.
export function normalizeBackupCode(raw: string): string {
  return raw.replace(/[^A-Za-z2-7]/g, '').toUpperCase();
}

export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () =>
    formatBackupCode(generateSecret({ length: BACKUP_CODE_BYTES }))
  );
}

export async function hashBackupCodes(
  hasher: PasswordHasher,
  codes: readonly string[]
): Promise<string[]> {
  return Promise.all(codes.map(code => hasher.hash(normalizeBackupCode(code))));
}

export type BackupCodeConsumeResult = {
  ok: boolean;
  // The stored hash list with the matched code's hash removed (single-use).
  // Unchanged (a copy) when no match is found. Callers persist this back to
  // auth.users.backup_codes themselves — this function does no I/O, mirroring
  // the pure-verification seam in totp-verification.ts.
  remaining: string[];
};

// Returns the stored bcrypt hash that matches the candidate, or null if none
// matches. Does not modify the hash list — callers use the returned hash as the
// predicate in an atomic conditional SQL UPDATE (ADS-975).
export async function findMatchingBackupCodeHash(
  hasher: PasswordHasher,
  storedHashes: readonly string[] | null,
  candidate: string
): Promise<string | null> {
  const hashes = storedHashes ?? [];
  const normalized = normalizeBackupCode(candidate);
  if (!normalized || hashes.length === 0) return null;

  for (const hash of hashes) {
    if (await hasher.compare(normalized, hash)) return hash;
  }
  return null;
}

export async function consumeBackupCode(
  hasher: PasswordHasher,
  storedHashes: readonly string[] | null,
  candidate: string
): Promise<BackupCodeConsumeResult> {
  const hashes = storedHashes ?? [];
  const normalized = normalizeBackupCode(candidate);
  if (!normalized || hashes.length === 0) {
    return { ok: false, remaining: hashes.slice() };
  }

  for (let i = 0; i < hashes.length; i += 1) {
    const matches = await hasher.compare(normalized, hashes[i]);
    if (matches) {
      return { ok: true, remaining: [...hashes.slice(0, i), ...hashes.slice(i + 1)] };
    }
  }
  return { ok: false, remaining: hashes.slice() };
}
