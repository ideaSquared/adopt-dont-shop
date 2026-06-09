// GDPR erasure for the rescue schema. Strategy: drop the user's staff
// memberships (so they no longer have rescue-scoped permissions) and
// detach them from any foster placements they were running. Rescue
// rows themselves are organisation records, not user-personal data.

import type { PoolClient } from 'pg';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

export async function eraseRescue(
  client: PoolClient,
  payload: GdprErasureRequestedPayload
): Promise<number> {
  let total = 0;
  for (const sql of [
    `DELETE FROM rescue.staff_members WHERE user_id = $1`,
    `UPDATE rescue.foster_placements SET foster_user_id = NULL, updated_at = now() WHERE foster_user_id = $1`,
    `DELETE FROM rescue.invitations WHERE invited_user_id = $1`,
  ]) {
    const res = await client.query(sql, [payload.userId]);
    total += res.rowCount ?? 0;
  }
  return total;
}
