// GDPR erasure for the cms schema. CMS content authored by the user
// stays (it's published platform content, not user-personal). Just
// anonymise the author_id + last_modified_by columns so the user can't
// be re-identified through content authorship.

import type { PoolClient } from 'pg';

import type { GdprErasureRequestedPayload } from '@adopt-dont-shop/events';

export async function eraseCms(
  client: PoolClient,
  payload: GdprErasureRequestedPayload
): Promise<number> {
  let total = 0;

  const a = await client.query(
    `UPDATE cms_content SET author_id = NULL, updated_at = now() WHERE author_id = $1`,
    [payload.userId]
  );
  total += a.rowCount ?? 0;

  const b = await client.query(
    `UPDATE cms_content
        SET last_modified_by = NULL, updated_at = now()
      WHERE last_modified_by = $1`,
    [payload.userId]
  );
  total += b.rowCount ?? 0;

  return total;
}
