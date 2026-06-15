// GDPR erasure for the matching schema. Swipe sessions + actions + the
// adopter's match profile are all pure user-derived data with no shared
// state — straight hard-delete.

import type { PoolClient } from 'pg';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

export async function eraseMatching(
  client: PoolClient,
  payload: GdprErasureRequestedPayload
): Promise<number> {
  let total = 0;
  // Order matters: swipe_actions FK swipe_sessions, so drop actions first.
  // Match on EITHER the action's own user_id OR its parent session's
  // owner: recordSwipe lets an authenticated user swipe within a
  // null-owner (anonymous) session, so a personal swipe row can hang off
  // a session the user doesn't own. Deleting only via session ownership
  // would orphan that personal data and breach erasure completeness.
  for (const sql of [
    `DELETE FROM matching.swipe_actions
       USING matching.swipe_sessions s
       WHERE matching.swipe_actions.session_id = s.session_id
         AND (matching.swipe_actions.user_id = $1 OR s.user_id = $1)`,
    `DELETE FROM matching.swipe_sessions WHERE user_id = $1`,
    `DELETE FROM matching.adopter_match_profiles WHERE user_id = $1`,
  ]) {
    const res = await client.query(sql, [payload.userId]);
    total += res.rowCount ?? 0;
  }
  return total;
}
