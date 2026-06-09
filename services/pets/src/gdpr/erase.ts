// GDPR erasure for the pets schema. Pet rows are rescue-owned (the
// rescue lists the pet, not the user); the only user-keyed tables here
// are favourites and ratings.

import type { PoolClient } from 'pg';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

export async function erasePets(
  client: PoolClient,
  payload: GdprErasureRequestedPayload
): Promise<number> {
  let total = 0;
  for (const sql of [
    `DELETE FROM pets.user_favorites WHERE user_id = $1`,
    `DELETE FROM pets.ratings WHERE user_id = $1`,
  ]) {
    const res = await client.query(sql, [payload.userId]);
    total += res.rowCount ?? 0;
  }
  return total;
}
