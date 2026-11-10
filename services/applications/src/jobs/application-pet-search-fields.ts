// Backfill the denormalised pet type / breed (migration 016) on applications
// that predate the columns, or whose StartDraft stamp did not land. Pet
// edits after that arrive through the pets.updated subscriber.
//
// One pass per run, paged by application_id, so rows whose pet can no
// longer be looked up (deleted pet, pets outage) are skipped rather than
// re-read forever; the next run retries them. Each pet is looked up once per
// batch. This only fills derived search columns, so it publishes no audit
// event.

import type { Pool } from 'pg';

import type { PetsClient } from '../grpc/pets-client.js';
import {
  petSearchFields,
  stampPetSearchFields,
  type PetSearchFields,
} from '../grpc/pet-search-fields.js';
import { principalToMetadata } from '../grpc/principal.js';
import { SYSTEM_PRINCIPAL } from '../grpc/system-principal.js';

export type ApplicationPetSearchFieldsOptions = { batchSize: number };
export type ApplicationPetSearchFieldsResult = { updatedCount: number };

type PendingRow = { application_id: string; pet_id: string };

const lookUpPets = async (
  petsClient: PetsClient,
  petIds: string[]
): Promise<Map<string, PetSearchFields>> => {
  const metadata = principalToMetadata(SYSTEM_PRINCIPAL);
  const looked = await Promise.all(
    petIds.map(async petId => {
      try {
        const res = await petsClient.getPet({ petId }, metadata);
        return [petId, petSearchFields(res.pet)] as const;
      } catch {
        return undefined;
      }
    })
  );
  return new Map(looked.filter(entry => entry !== undefined));
};

export async function backfillApplicationPetSearchFields(
  deps: { pool: Pool },
  petsClient: PetsClient,
  opts: ApplicationPetSearchFieldsOptions
): Promise<ApplicationPetSearchFieldsResult> {
  let updatedCount = 0;
  let after = '';

  for (;;) {
    const { rows } = await deps.pool.query<PendingRow>(
      `SELECT application_id, pet_id
         FROM applications
        WHERE pet_type IS NULL AND deleted_at IS NULL AND application_id::text > $1
        ORDER BY application_id
        LIMIT $2`,
      [after, opts.batchSize]
    );
    if (rows.length === 0) {
      break;
    }

    const petFields = await lookUpPets(petsClient, [...new Set(rows.map(r => r.pet_id))]);
    const fillable = rows.flatMap(row => {
      const fields = petFields.get(row.pet_id);
      return fields?.petType ? [{ applicationId: row.application_id, fields }] : [];
    });
    for (const { applicationId, fields } of fillable) {
      await stampPetSearchFields(deps.pool, applicationId, fields);
    }
    updatedCount += fillable.length;

    after = rows[rows.length - 1].application_id;
    if (rows.length < opts.batchSize) {
      break;
    }
  }

  return { updatedCount };
}
