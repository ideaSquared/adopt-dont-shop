import { describe, expect, it } from 'vitest';

import { BREEDS_BY_SPECIES, composeBio, photoUrl, SPECIES } from './pets.js';

describe('BREEDS_BY_SPECIES', () => {
  it('has at least one real breed for every species', () => {
    for (const species of SPECIES) {
      expect(BREEDS_BY_SPECIES[species].length).toBeGreaterThan(0);
    }
  });
});

describe('photoUrl', () => {
  it('is a species-matched, lock-seeded absolute https url (passes resolveFileUrl)', () => {
    const url = photoUrl('cat', 7);
    expect(url).toBe('https://loremflickr.com/640/480/cat?lock=7');
  });

  it('is stable for the same species + lock (so a pet keeps its photo)', () => {
    expect(photoUrl('dog', 3)).toBe(photoUrl('dog', 3));
  });
});

describe('composeBio', () => {
  const faker = { helpers: { arrayElement: <T>(arr: readonly T[]): T => arr[0] } };

  it('names the pet in both the short and long copy', () => {
    const bio = composeBio(faker, 'Luna', 'dog');
    expect(bio.short).toContain('Luna');
    expect(bio.long).toContain('Luna');
    expect(bio.short.length).toBeGreaterThan(0);
  });
});
