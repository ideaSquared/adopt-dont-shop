// Retention for pets.pet_views. The views_today label only reads the last
// 24 hours, so older rows are pure retained user activity; drop them on a
// schedule instead of keeping a growing per-user history. The DELETE is
// idempotent, so running it on every replica needs no cross-instance claim.

import type { Pool } from 'pg';

export const PET_VIEWS_RETENTION_DAYS = 7;

export async function prunePetViews(pool: Pool): Promise<number> {
  const res = await pool.query(
    `DELETE FROM pets.pet_views WHERE viewed_at < now() - ($1 * interval '1 day')`,
    [PET_VIEWS_RETENTION_DAYS]
  );
  return res.rowCount ?? 0;
}
