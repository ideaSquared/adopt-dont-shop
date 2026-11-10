import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { PetsV1 } from '@adopt-dont-shop/proto';

import type { PetsClient } from '../grpc/pets-client.js';

import { backfillApplicationPetSnapshots } from './application-pet-snapshot.js';

type Row = { application_id: string; pet_id: string };

// A pool whose SELECT returns `batches` in order; UPDATEs are recorded.
const makePool = (batches: Row[][]) => {
  const updates: unknown[][] = [];
  const queue = [...batches];
  const query = vi.fn(async (sql: string, params: unknown[]) => {
    if (sql.includes('UPDATE applications')) {
      updates.push(params);
      return { rows: [] };
    }
    return { rows: queue.shift() ?? [] };
  });
  return { pool: { query } as unknown as Pool, query, updates };
};

const pet = (petId: string, type: PetsV1.PetType, breed?: string) => ({
  pet: {
    petId,
    type,
    extraJson: breed === undefined ? '{}' : JSON.stringify({ breed }),
  },
});

const makePetsClient = (getPet: ReturnType<typeof vi.fn>) =>
  ({ getPet, close: vi.fn() }) as unknown as PetsClient;

describe('backfillApplicationPetSnapshots', () => {
  it('fills pet type and breed on applications that predate the snapshot, one lookup per pet', async () => {
    const { pool, updates } = makePool([
      [
        { application_id: 'app-1', pet_id: 'pet-1' },
        { application_id: 'app-2', pet_id: 'pet-1' },
        { application_id: 'app-3', pet_id: 'pet-2' },
      ],
    ]);
    const getPet = vi.fn(async ({ petId }: { petId: string }) =>
      petId === 'pet-1'
        ? pet('pet-1', PetsV1.PetType.PET_TYPE_DOG, 'Labrador Retriever')
        : pet('pet-2', PetsV1.PetType.PET_TYPE_CAT)
    );

    const { updatedCount } = await backfillApplicationPetSnapshots(
      { pool },
      makePetsClient(getPet),
      { batchSize: 10 }
    );

    expect(updatedCount).toBe(3);
    expect(getPet).toHaveBeenCalledTimes(2);
    expect(updates).toEqual([
      ['dog', 'Labrador Retriever', 'app-1'],
      ['dog', 'Labrador Retriever', 'app-2'],
      ['cat', null, 'app-3'],
    ]);
  });

  it('skips pets it cannot look up and still finishes the run', async () => {
    const { pool, updates } = makePool([
      [
        { application_id: 'app-1', pet_id: 'gone' },
        { application_id: 'app-2', pet_id: 'pet-2' },
      ],
    ]);
    const getPet = vi.fn(async ({ petId }: { petId: string }) => {
      if (petId === 'gone') {
        throw Object.assign(new Error('not found'), { code: 5 });
      }
      return pet('pet-2', PetsV1.PetType.PET_TYPE_RABBIT);
    });

    const { updatedCount } = await backfillApplicationPetSnapshots(
      { pool },
      makePetsClient(getPet),
      { batchSize: 10 }
    );

    expect(updatedCount).toBe(1);
    expect(updates).toEqual([['rabbit', null, 'app-2']]);
  });

  it('pages by application id so rows it cannot fill never loop forever', async () => {
    const { pool, query } = makePool([
      [
        { application_id: 'app-1', pet_id: 'gone' },
        { application_id: 'app-2', pet_id: 'gone' },
      ],
      [],
    ]);
    const getPet = vi.fn().mockRejectedValue(Object.assign(new Error('nope'), { code: 5 }));

    await backfillApplicationPetSnapshots({ pool }, makePetsClient(getPet), { batchSize: 2 });

    const selects = query.mock.calls.filter(([sql]) => (sql as string).includes('SELECT'));
    expect(selects).toHaveLength(2);
    expect(selects[1][1]).toEqual(['app-2', 2]);
  });
});
