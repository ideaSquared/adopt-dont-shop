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

  // The applications read model stores the user's answers + references
  // inside the JSONB `documents` column (the projector writes
  // { answers, references } there — there are no separate answers /
  // references columns). Scrub that blob alongside the free-text notes.
  const appsRes = await client.query(
    `UPDATE applications.applications
        SET documents = '{"answers":{},"references":[]}'::jsonb,
            notes = NULL,
            interview_notes = NULL,
            home_visit_notes = NULL,
            updated_at = now()
      WHERE user_id = $1`,
    [payload.userId]
  );
  total += appsRes.rowCount ?? 0;

  // The read path (Get/List/timeline) folds the EVENT STREAM, not the
  // read-model blob above — so scrubbing only `applications` leaves the
  // adopter's answers, references and free-text reason/notes in
  // application_events.event_data, where the next Get re-folds and
  // resurfaces them. We must anonymise the event payloads too.
  //
  // application_events is append-only (migration 001 installs a trigger
  // that rejects UPDATE/DELETE). The trigger honours one sanctioned
  // escape hatch: the `applications.allow_event_mutation` GUC. SET LOCAL
  // scopes it to THIS transaction only, so it can't leak across the
  // pooled connection. We strip the PII-bearing keys from each payload
  // (answers, references, notes, note, reason) while preserving the
  // forensic skeleton (type, ids, timestamps, status transitions, the
  // rescue actor who acted) so the timeline still reconstructs.
  await client.query(`SET LOCAL applications.allow_event_mutation = 'on'`);
  await client.query(
    `UPDATE applications.application_events e
        SET event_data = e.event_data
              - 'answers'
              - 'answersPatch'
              - 'references'
              - 'notes'
              - 'note'
              - 'reason'
       FROM applications.applications a
      WHERE e.aggregate_id = a.application_id
        AND a.user_id = $1`,
    [payload.userId]
  );

  // Documents the user uploaded: hard-delete the metadata rows (the bytes
  // sitting in storage are erased by a separate retention sweep — see
  // gateway uploads route).
  const docsRes = await client.query(
    `DELETE FROM applications.application_documents
       USING applications.applications a
       WHERE applications.application_documents.application_id = a.application_id
         AND a.user_id = $1`,
    [payload.userId]
  );
  total += docsRes.rowCount ?? 0;

  return total;
}
