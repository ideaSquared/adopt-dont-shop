import { describe, expect, it } from 'vitest';

import { haversineMiles, parseUserLocation } from './distance.js';

const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const MANCHESTER = { latitude: 53.4808, longitude: -2.2426 };

describe('haversineMiles', () => {
  it('measures London to Manchester at roughly 163 miles, to one decimal place', () => {
    const miles = haversineMiles(LONDON, MANCHESTER);
    expect(miles).toBeGreaterThan(160);
    expect(miles).toBeLessThan(166);
    expect(Number.isInteger(miles * 10)).toBe(true);
  });

  it('is zero for the same point and symmetric', () => {
    expect(haversineMiles(LONDON, LONDON)).toBe(0);
    expect(haversineMiles(LONDON, MANCHESTER)).toBe(haversineMiles(MANCHESTER, LONDON));
  });
});

describe('parseUserLocation', () => {
  it('accepts numbers and numeric strings', () => {
    expect(parseUserLocation(51.5, -0.12)).toEqual({ latitude: 51.5, longitude: -0.12 });
    expect(parseUserLocation('51.5', '-0.12')).toEqual({ latitude: 51.5, longitude: -0.12 });
  });

  it.each([
    [undefined, undefined],
    [51.5, undefined],
    ['', ''],
    ['abc', '1'],
    [91, 0],
    [0, 181],
    [null, null],
  ])('returns undefined for lat=%j lng=%j', (lat, lng) => {
    expect(parseUserLocation(lat, lng)).toBeUndefined();
  });
});
