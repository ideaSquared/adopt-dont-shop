import { createSpamFaker, PET_NAMES, seededUuid } from '@adopt-dont-shop/seed-faker';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildPetRows, runSpam, spamPets, type QueryFn } from './spam.js';

const RESCUES = [seededUuid('rescue-0'), seededUuid('rescue-1')];
const STAFF = [seededUuid('staff-0')];
const ADOPTERS = [seededUuid('adopter-0')];

// Column order mirrors PET_COLUMNS in spam.ts.
const COL = {
  pet_id: 0,
  name: 1,
  rescue_id: 2,
  breed_id: 3,
  type: 10,
  extra_json: 15,
  created_by: 16,
} as const;

describe('buildPetRows', () => {
  it('gives every pet a deterministic id from its index', () => {
    const rows = buildPetRows(createSpamFaker(), 3, RESCUES, STAFF);
    expect(rows).toHaveLength(3);
    expect(rows[0][COL.pet_id]).toBe(seededUuid('pet-0'));
    expect(rows[2][COL.pet_id]).toBe(seededUuid('pet-2'));
  });

  it('is fully deterministic — same seed yields identical rows', () => {
    const a = buildPetRows(createSpamFaker(), 5, RESCUES, STAFF, new Date(0));
    const b = buildPetRows(createSpamFaker(), 5, RESCUES, STAFF, new Date(0));
    expect(a).toEqual(b);
  });

  it('names pets from the real name pool, not faker people-names', () => {
    const rows = buildPetRows(createSpamFaker(), 10, RESCUES, STAFF);
    for (const row of rows) {
      expect(PET_NAMES).toContain(row[COL.name]);
    }
  });

  it('attaches a breed_id and a matching display breed to each pet', () => {
    const rows = buildPetRows(createSpamFaker(), 10, RESCUES, STAFF);
    for (const row of rows) {
      expect(typeof row[COL.breed_id]).toBe('string');
      const extra = JSON.parse(row[COL.extra_json] as string) as { breed: string };
      // The stored breed_id is derived from the same (species, name) pair as
      // the display name, so they never drift.
      expect(row[COL.breed_id]).toBe(seededUuid(`breed-${row[COL.type] as string}-${extra.breed}`));
    }
  });

  it('gives each pet real species-matched photo urls in extra_json.image_urls', () => {
    const rows = buildPetRows(createSpamFaker(), 10, RESCUES, STAFF);
    for (const row of rows) {
      const extra = JSON.parse(row[COL.extra_json] as string) as { image_urls: string[] };
      expect(extra.image_urls.length).toBeGreaterThan(0);
      for (const url of extra.image_urls) {
        expect(url).toMatch(/^https:\/\/loremflickr\.com\/640\/480\/[a-z]+\?lock=\d+$/);
      }
    }
  });

  it('spreads pets across the supplied rescues and staff owners', () => {
    const rows = buildPetRows(createSpamFaker(), 4, RESCUES, STAFF);
    for (const row of rows) {
      expect(RESCUES).toContain(row[COL.rescue_id]);
      expect(STAFF).toContain(row[COL.created_by]);
    }
  });
});

function recordingQuery(): { query: QueryFn; calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query: QueryFn = async (text, values) => {
    calls.push({ text, values: [...values] });
    return { rows: [] };
  };
  return { query, calls };
}

describe('spamPets', () => {
  it('inserts pets and ratings idempotently (ON CONFLICT DO NOTHING)', async () => {
    const { query, calls } = recordingQuery();

    const result = await spamPets({
      query,
      faker: createSpamFaker(),
      pets: 3,
      ratings: 2,
      rescueIds: RESCUES,
      adopterIds: ADOPTERS,
      staffIds: STAFF,
    });

    expect(result).toEqual({ pets: 3, ratings: 2 });
    const petInsert = calls.find(c => c.text.includes('INTO pets.pets'));
    const ratingInsert = calls.find(c => c.text.includes('INTO pets.ratings'));
    expect(petInsert?.text).toMatch(/ON CONFLICT \(pet_id\) DO NOTHING/);
    expect(ratingInsert?.text).toMatch(/ON CONFLICT \(rating_id\) DO NOTHING/);
  });

  it('skips ratings when there are no adopters to review', async () => {
    const { query } = recordingQuery();
    const result = await spamPets({
      query,
      faker: createSpamFaker(),
      pets: 2,
      ratings: 5,
      rescueIds: RESCUES,
      adopterIds: [],
      staffIds: STAFF,
    });
    expect(result.ratings).toBe(0);
  });
});

describe('runSpam', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('bootstraps breeds and seeds the catalogue when the flag is unset', async () => {
    vi.stubEnv('SEED_ONLY_IF_EMPTY', '');
    vi.stubEnv('SPAM_PETS', '3');
    vi.stubEnv('SPAM_RATINGS', '0');
    const { query, calls } = recordingQuery();

    const result = await runSpam({ query, faker: createSpamFaker() });

    expect(result.seeded).toBe(true);
    expect(result.pets).toBe(3);
    // breeds are bootstrapped (FK target) then the catalogue is inserted.
    expect(calls.some(c => c.text.includes('INTO pets.breeds'))).toBe(true);
    expect(calls.some(c => c.text.includes('INTO pets.pets'))).toBe(true);
  });

  it('skips on boot when the anchor pet already exists', async () => {
    vi.stubEnv('SEED_ONLY_IF_EMPTY', 'true');
    const inserts: string[] = [];
    const query: QueryFn = async text => {
      if (text.includes('SELECT 1 FROM pets.pets')) {
        return { rows: [{ '?column?': 1 }] };
      }
      if (text.includes('INTO')) {
        inserts.push(text);
      }
      return { rows: [] };
    };

    const result = await runSpam({ query, faker: createSpamFaker() });

    expect(result).toEqual({ seeded: false, pets: 0, ratings: 0 });
    expect(inserts).toHaveLength(0);
  });
});
