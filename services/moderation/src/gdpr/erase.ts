// GDPR erasure for the moderation schema. Anonymise reports filed by
// the user (keep the row so the reported party's moderation history
// remains intact), redact the scanned-text excerpts in system
// auto-reports about the user, and hard-delete the user's support tickets +
// responses. user_sanctions rows are preserved without modification —
// they're a record of platform action and survive erasure.

import type { PoolClient } from 'pg';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

import { SYSTEM_USER_ID } from '../nats/system-principal.js';

export async function eraseModeration(
  client: PoolClient,
  payload: GdprErasureRequestedPayload
): Promise<number> {
  let total = 0;

  // Reports filed BY this user — anonymise reporter_id + description.
  const rep1 = await client.query(
    `UPDATE moderation.reports
        SET reporter_id = NULL,
            description = '[erased]',
            updated_at = now()
      WHERE reporter_id = $1`,
    [payload.userId]
  );
  total += rep1.rowCount ?? 0;

  // Auto-reports the system filed ABOUT this user quote up to 300 chars of
  // the scanned text (their chat message, application answer) in the
  // description. Redact it; keep the row so the moderation history and
  // any sanction it led to stay intact. Reports other users wrote about
  // them are the reporter's own words and are left alone.
  const rep2 = await client.query(
    `UPDATE moderation.reports
        SET description = '[erased]',
            updated_at = now()
      WHERE reported_user_id = $1 AND reporter_id = $2`,
    [payload.userId, SYSTEM_USER_ID]
  );
  total += rep2.rowCount ?? 0;

  // Support tickets opened by the user — drop the lot. Ticket
  // responses cascade via FK ON DELETE CASCADE (set in the migration).
  const tk = await client.query(`DELETE FROM moderation.support_tickets WHERE user_id = $1`, [
    payload.userId,
  ]);
  total += tk.rowCount ?? 0;

  return total;
}
