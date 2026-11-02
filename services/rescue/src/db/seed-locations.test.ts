import { describe, expect, it } from 'vitest';

import { SEED_LOCATIONS, seedLocation } from './seed-locations.js';

// Full UK postcode: outward code (1-2 letters, a digit, optional digit/letter)
// then inward code (digit + 2 letters). Same shape the geocoder expects.
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/;

describe('SEED_LOCATIONS', () => {
  it('only holds well-formed UK postcodes', () => {
    for (const { postcode } of SEED_LOCATIONS) {
      expect(postcode).toMatch(UK_POSTCODE);
    }
  });

  it('never repeats a postcode or a city', () => {
    expect(new Set(SEED_LOCATIONS.map(l => l.postcode)).size).toBe(SEED_LOCATIONS.length);
    expect(new Set(SEED_LOCATIONS.map(l => l.city)).size).toBe(SEED_LOCATIONS.length);
  });

  it('keeps every coordinate inside the UK', () => {
    for (const { latitude, longitude } of SEED_LOCATIONS) {
      expect(latitude).toBeGreaterThan(49.8);
      expect(latitude).toBeLessThan(60.9);
      expect(longitude).toBeGreaterThan(-8.7);
      expect(longitude).toBeLessThan(1.8);
    }
  });

  it('spreads the default eight rescues across the whole country', () => {
    const firstEight = SEED_LOCATIONS.slice(0, 8);
    const latitudes = firstEight.map(l => l.latitude);
    const longitudes = firstEight.map(l => l.longitude);

    // Scotland to the south coast, and Northern Ireland to East Anglia.
    expect(Math.max(...latitudes) - Math.min(...latitudes)).toBeGreaterThan(4);
    expect(Math.max(...longitudes) - Math.min(...longitudes)).toBeGreaterThan(5);
  });
});

describe('seedLocation', () => {
  it('is stable for an index and wraps past the end of the table', () => {
    expect(seedLocation(0)).toBe(SEED_LOCATIONS[0]);
    expect(seedLocation(SEED_LOCATIONS.length)).toBe(SEED_LOCATIONS[0]);
    expect(seedLocation(SEED_LOCATIONS.length + 3)).toBe(SEED_LOCATIONS[3]);
  });
});
