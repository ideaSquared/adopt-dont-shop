// GDPR erasure for the rescue schema. Strategy: drop the user's staff
// memberships (so they no longer have rescue-scoped permissions),
// soft-delete any foster placements they were running (foster_user_id is
// NOT NULL, so we can't detach in place — soft-delete preserves the
// org's history without retaining the erased user as an active foster),
// and drop invitations linked to the user. Rescue rows themselves are
// organisation records, not user-personal data.

import type { PoolClient } from 'pg';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

export async function eraseRescue(
  client: PoolClient,
  payload: GdprErasureRequestedPayload
): Promise<number> {
  let total = 0;
  for (const sql of [
    `DELETE FROM rescue.staff_members WHERE user_id = $1`,
    `UPDATE rescue.foster_placements SET deleted_at = now(), updated_at = now() WHERE foster_user_id = $1 AND deleted_at IS NULL`,
    `DELETE FROM rescue.invitations WHERE user_id = $1`,
  ]) {
    const res = await client.query(sql, [payload.userId]);
    total += res.rowCount ?? 0;
  }
  return total;
}
