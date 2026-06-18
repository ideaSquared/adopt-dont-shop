import { describe, expect, it } from 'vitest';

import { seedFavorites, seedPets, type QueryFn } from './seed.js';
import { SEED_FAVORITES, SEED_PETS } from './seed-data.js';

function recordingQuery(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return undefined;
  };
  return { query, calls };
}

describe('pets seed', () => {
  it('seeds every pet exactly once', async () => {
    const { query, calls } = recordingQuery();

    const seeded = await seedPets({ query });

    expect(calls).toHaveLength(SEED_PETS.length);
    expect(seeded).toEqual(SEED_PETS.map(p => p.name));
  });

  it('seeds the available pet id the e2e suite reads (SEEDED_PET_IDS.available)', async () => {
    const { query, calls } = recordingQuery();

    await seedPets({ query });

    const petIds = calls.map(c => c.values[0]);
    expect(petIds).toContain('9ff53898-c5c6-4422-a245-54e52d4c4b78');
  });

  it('attaches pets to a seeded rescue so the golden path resolves an owner', async () => {
    const { query, calls } = recordingQuery();

    await seedPets({ query });

    for (const call of calls) {
      // rescue_id is the 2nd param ($2) and must be set.
      expect(call.values[1]).toBeTruthy();
    }
  });

  it('is idempotent — every insert uses ON CONFLICT (pet_id) DO UPDATE', async () => {
    const { query, calls } = recordingQuery();

    await seedPets({ query });

    for (const call of calls) {
      expect(call.text).toMatch(/ON CONFLICT \(pet_id\) DO UPDATE/);
    }

    const second = recordingQuery();
    await seedPets({ query: second.query });
    expect(second.calls).toHaveLength(calls.length);
  });

  it('seeds John Smith two favourites with an idempotent (revive) upsert', async () => {
    const { query, calls } = recordingQuery();

    const count = await seedFavorites({ query });

    expect(count).toBe(SEED_FAVORITES.length);
    expect(calls).toHaveLength(SEED_FAVORITES.length);
    // ON CONFLICT revives a row a prior e2e run soft-deleted.
    for (const call of calls) {
      expect(call.text).toMatch(/ON CONFLICT \(id\) DO UPDATE SET deleted_at = NULL/);
    }
    expect(calls[0].values).toEqual([
      SEED_FAVORITES[0].id,
      SEED_FAVORITES[0].userId,
      SEED_FAVORITES[0].petId,
    ]);
  });
});
