// GDPR erasure for the rescue schema. Strategy: drop the user's staff
// memberships (so they no longer have rescue-scoped permissions),
// soft-delete any foster placements they were running (foster_user_id is
// NOT NULL, so we can't detach in place — soft-delete preserves the
// org's history without retaining the erased user as an active foster),
// and drop invitations linked to the user. Rescue rows themselves are
// organisation records, not user-personal data.
//
// Pending invitations are keyed by EMAIL, not user_id: an invitee who
// never created an account has a NULL user_id on their invitation row, so
// the user_id-keyed delete misses them and leaves their email behind as
// PII residue. When the erasure event carries the resolved email, we also
// delete invitations matching it (case-insensitively, mirroring the
// invitations_one_pending_per_email index which keys on lower(email)).

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

  // Email-keyed pending invitations (NULL user_id on the row).
  if (payload.email) {
    const res = await client.query(
      `DELETE FROM rescue.invitations WHERE lower(email) = lower($1)`,
      [payload.email]
    );
    total += res.rowCount ?? 0;
  }

  return total;
}
