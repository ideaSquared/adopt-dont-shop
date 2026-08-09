import { createSpamFaker, seededUuid } from '@adopt-dont-shop/seed-faker';
import { describe, expect, it } from 'vitest';

import { runSpam, spamApplications, type QueryFn } from './spam.js';

function recording(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return { rows: [] };
  };
  return { query, calls };
}

const ADOPTERS = [seededUuid('adopter-0')];
const PETS = [
  { pet_id: seededUuid('pet-0'), rescue_id: seededUuid('rescue-0') },
  { pet_id: seededUuid('pet-1'), rescue_id: seededUuid('rescue-1') },
];

describe('spamApplications', () => {
  it('inserts idempotently on the deterministic application_id', async () => {
    const { query, calls } = recording();

    const result = await spamApplications({
      query,
      faker: createSpamFaker(),
      applications: 10,
      adopterIds: ADOPTERS,
      pets: PETS,
    });

    // Only two adopter/pet pairs exist, so the request is capped at 2.
    expect(result.applications).toBe(2);
    expect(calls[0].text).toMatch(/ON CONFLICT \(application_id\) DO NOTHING/);
    // First column of the first row is the deterministic per-pair id.
    const firstId = calls[0].values[0];
    expect([
      seededUuid(`app-${ADOPTERS[0]}-${PETS[0].pet_id}`),
      seededUuid(`app-${ADOPTERS[0]}-${PETS[1].pet_id}`),
    ]).toContain(firstId);
  });
});

describe('runSpam', () => {
  const stubReads = (): QueryFn => async text => {
    if (text.includes("user_type = 'adopter'")) {
      return { rows: ADOPTERS.map(user_id => ({ user_id })) };
    }
    if (text.includes('FROM pets.pets p')) {
      return { rows: PETS };
    }
    return { rows: [] };
  };

  it('reads the spam adopters + pets and seeds applications for their pairs', async () => {
    const result = await runSpam({ query: stubReads(), faker: createSpamFaker() });
    // 1 adopter × 2 pets = 2 distinct pairs.
    expect(result.applications).toBe(2);
  });

  it('throws when no spam adopters/pets exist yet', async () => {
    const emptyQuery: QueryFn = async () => ({ rows: [] });
    await expect(runSpam({ query: emptyQuery, faker: createSpamFaker() })).rejects.toThrow(
      /run the auth, rescue and pets spam first/
    );
  });
});
