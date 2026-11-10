// Denormalised pet type / breed on the applications read model (migration 016).
//
// Staff filter the applications list by pet type and breed, but the pet
// lives in the pets service's schema. Kept current three ways:
//   - StartDraft stamps them from the pet it already fetches;
//   - the pets.updated subscriber (src/nats/pet-updates.ts) rewrites them
//     whenever the pet changes (event-carried state transfer);
//   - the application-pet-search-fields job fills rows that predate the
//     columns or whose StartDraft stamp did not land.
// The projector's UPSERT never writes these columns, so later projections
// keep them.

import type { Pool, PoolClient } from 'pg';

import { PetsV1 } from '@adopt-dont-shop/proto';

export type PetSearchFields = { petType: string | null; petBreed: string | null };

// The same lowercase token the gateway's list view shows (PET_TYPE_DOG → 'dog').
function petTypeToken(type: PetsV1.PetType | undefined): string | null {
  if (type === undefined || type <= 0) {
    return null;
  }
  const json = PetsV1.petTypeToJSON(type);
  return json.startsWith('PET_TYPE_') ? json.slice('PET_TYPE_'.length).toLowerCase() : null;
}

// The proto Pet carries only breed ids; the breed name the UI shows is the copy kept in
// extra_json (see the gateway's pets-view).
function breedName(extraJson: string | undefined): string | null {
  try {
    const parsed: unknown = JSON.parse(extraJson ?? '');
    if (typeof parsed !== 'object' || parsed === null || !('breed' in parsed)) {
      return null;
    }
    const breed = parsed.breed;
    return typeof breed === 'string' && breed.trim() !== '' ? breed.trim() : null;
  } catch {
    return null;
  }
}

export function petSearchFields(pet: PetsV1.Pet | undefined): PetSearchFields {
  return { petType: petTypeToken(pet?.type), petBreed: breedName(pet?.extraJson) };
}

export async function stampPetSearchFields(
  db: Pick<Pool | PoolClient, 'query'>,
  applicationId: string,
  fields: PetSearchFields
): Promise<void> {
  await db.query(
    `UPDATE applications SET pet_type = $1, pet_breed = $2 WHERE application_id = $3`,
    [fields.petType, fields.petBreed, applicationId]
  );
}
