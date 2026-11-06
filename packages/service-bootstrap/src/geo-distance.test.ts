import { describe, expect, it } from 'vitest';

import { haversineMiles, parseClientLocationHeader, parseUserLocation } from './geo-distance.js';

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

describe('parseClientLocationHeader', () => {
  it('reads "lat,lng"', () => {
    expect(parseClientLocationHeader('51.5074,-0.1278')).toEqual({
      latitude: 51.5074,
      longitude: -0.1278,
    });
    expect(parseClientLocationHeader(' 51.5 , -0.12 ')).toEqual({
      latitude: 51.5,
      longitude: -0.12,
    });
    expect(parseClientLocationHeader('-33,151')).toEqual({ latitude: -33, longitude: 151 });
  });

  it.each([
    [undefined],
    [''],
    ['51.5'],
    ['51.5,'],
    ['51.5,-0.12,3'],
    ['abc,def'],
    ['1e2,3'],
    ['NaN,1'],
    ['Infinity,1'],
    ['91,0'],
    ['0,181'],
    ['51.5;-0.12'],
    ['0x10,1'],
    [`${'1'.repeat(60)},1`],
    [['51.5,-0.12', '10,10']],
    [51.5],
    [null],
  ])('ignores %j instead of failing', value => {
    expect(parseClientLocationHeader(value)).toBeUndefined();
  });
});
