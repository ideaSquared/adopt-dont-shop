// GDPR erasure for the applications schema. Strategy: anonymise the
// applicant's identifiable fields on every application they filed, but
// keep the row so rescue staff retain the operational record of past
// adoptions (legal retention period for rescue records often exceeds
// the user's own data-retention preference).

import type { PoolClient } from 'pg';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

export async function eraseApplications(
  client: PoolClient,
  payload: GdprErasureRequestedPayload
): Promise<number> {
  let total = 0;

  // The applications table stores the user's answers + references as
  // JSONB. Scrub these alongside the personal columns.
  const appsRes = await client.query(
    `UPDATE applications.applications
        SET answers = '{}'::jsonb,
            "references" = '[]'::jsonb,
            notes = NULL,
            interview_notes = NULL,
            home_visit_notes = NULL,
            updated_at = now()
      WHERE user_id = $1`,
    [payload.userId]
  );
  total += appsRes.rowCount ?? 0;

  // Documents the user uploaded: hard-delete the metadata rows (the bytes
  // sitting in storage are erased by a separate retention sweep — see
  // gateway uploads route).
  const docsRes = await client.query(
    `DELETE FROM applications.documents
       USING applications.applications a
       WHERE applications.documents.application_id = a.application_id
         AND a.user_id = $1`,
    [payload.userId]
  );
  total += docsRes.rowCount ?? 0;

  return total;
}
