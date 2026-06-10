import { describe, expect, it } from 'vitest';

import { seedPets, type QueryFn } from './seed.js';
import { SEED_PETS } from './seed-data.js';

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
});
