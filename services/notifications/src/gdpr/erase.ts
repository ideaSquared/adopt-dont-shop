// GDPR erasure for the notifications schema. Drops notification rows,
// device tokens, the per-user prefs entry, and the user's email_queue
// rows. No anonymisation strategy here — notifications are intrinsically
// about the user, so scrubbing PII while leaving the row would still
// leak (e.g. message body contains the user's name, an email_queue row
// holds the recipient address and rendered body). Hard-delete is the
// right tool.

import type { PoolClient } from 'pg';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

export async function eraseNotifications(
  client: PoolClient,
  payload: GdprErasureRequestedPayload
): Promise<number> {
  let total = 0;

  const tables = [
    'notifications.notifications',
    'notifications.user_notification_prefs',
    'notifications.email_preferences',
    'notifications.device_tokens',
    'notifications.email_queue',
  ];
  for (const table of tables) {
    const res = await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [payload.userId]);
    total += res.rowCount ?? 0;
  }
  return total;
}
