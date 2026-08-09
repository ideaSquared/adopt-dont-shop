/**
 * Deterministic UUID from a string key.
 *
 * The spam seeders used to mint `crypto.randomUUID()` per row, which made a
 * re-run ADD fresh rows (never converge) and left no stable id to reference a
 * seeded entity by. Deriving the id from a fixed key instead makes the
 * seeders idempotent — the same key always produces the same id, so an
 * `ON CONFLICT DO NOTHING` insert converges to a fixed dataset on every run
 * (including every container boot) — and lets one service compute another's
 * ids (e.g. pets → `rescue-3`) WITHOUT a cross-schema read, so per-container
 * boot seeding no longer needs a run-order guarantee.
 *
 * NOT cryptographic and NOT a real UUID v5 (no namespace) — it's a stable
 * hash formatted as a v4-shaped UUID so Postgres `uuid` columns accept it.
 */

import { createHash } from 'node:crypto';

export const seededUuid = (key: string): string => {
  const h = createHash('sha256').update(key).digest('hex').slice(0, 32);
  // Stamp the version nibble (4) and RFC-4122 variant bits (8–b) so the
  // string is a valid v4-shaped UUID regardless of the hash bytes.
  const variant = ((Number.parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return (
    `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-` +
    `${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`
  );
};
