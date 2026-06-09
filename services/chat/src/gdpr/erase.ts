// GDPR erasure for the chat schema. Strategy: anonymise messages
// (clearing content + sender display) rather than delete, because
// counterparty users + audit trails of the conversation need to remain
// intact. Drop reactions / reads / participant rows the erased user
// owned.

import type { PoolClient } from 'pg';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

export async function eraseChat(
  client: PoolClient,
  payload: GdprErasureRequestedPayload
): Promise<number> {
  let total = 0;

  const msgRes = await client.query(
    `UPDATE chat.messages
        SET content = '[erased]', deleted_at = now(), updated_at = now()
      WHERE sender_id = $1 AND deleted_at IS NULL`,
    [payload.userId]
  );
  total += msgRes.rowCount ?? 0;

  for (const sql of [
    `DELETE FROM chat.message_reactions WHERE user_id = $1`,
    `DELETE FROM chat.message_reads WHERE user_id = $1`,
    `DELETE FROM chat.chat_participants WHERE user_id = $1`,
  ]) {
    const res = await client.query(sql, [payload.userId]);
    total += res.rowCount ?? 0;
  }
  return total;
}
