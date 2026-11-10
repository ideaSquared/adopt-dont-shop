// Pet type / breed snapshot on the applications read model (migration 016).
//
// Staff filter the applications list by pet type and breed, but the pet
// lives in the pets service's schema. StartDraft already fetches the pet, so
// it stamps these columns; the application-pet-snapshot job fills rows that
// predate them. The projector's UPSERT never writes these columns, so later
// projections keep them.

import type { Pool, PoolClient } from 'pg';

import { PetsV1 } from '@adopt-dont-shop/proto';

export type PetSnapshot = { petType: string | null; petBreed: string | null };

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

export function petSnapshot(pet: PetsV1.Pet | undefined): PetSnapshot {
  return { petType: petTypeToken(pet?.type), petBreed: breedName(pet?.extraJson) };
}

export async function stampPetSnapshot(
  db: Pick<Pool | PoolClient, 'query'>,
  applicationId: string,
  snapshot: PetSnapshot
): Promise<void> {
  await db.query(
    `UPDATE applications SET pet_type = $1, pet_breed = $2 WHERE application_id = $3`,
    [snapshot.petType, snapshot.petBreed, applicationId]
  );
}
