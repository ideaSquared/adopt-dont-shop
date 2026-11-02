import { describe, expect, it, vi } from 'vitest';

import { createPostcodesIoGeocoder } from './geocode.js';

const jsonResponse = (body: unknown, ok = true): Response =>
  ({ ok, json: async () => body }) as unknown as Response;

describe('createPostcodesIoGeocoder', () => {
  it('resolves a postcode to coordinates', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse({ result: { latitude: 51.5, longitude: -0.12 } }));
    const geocode = createPostcodesIoGeocoder({ fetchFn });

    await expect(geocode('SW1A 1AA')).resolves.toEqual({ latitude: 51.5, longitude: -0.12 });
    expect(fetchFn.mock.calls[0][0]).toBe('https://api.postcodes.io/postcodes/SW1A%201AA');
  });

  it('returns undefined for an unknown postcode', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ error: 'Not found' }, false));
    await expect(createPostcodesIoGeocoder({ fetchFn })('ZZ99 9ZZ')).resolves.toBeUndefined();
  });

  it('returns undefined when coordinates are missing or malformed', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse({ result: { latitude: null, longitude: 'x' } }));
    await expect(createPostcodesIoGeocoder({ fetchFn })('SW1A 1AA')).resolves.toBeUndefined();
  });

  it('swallows network failures and skips the call for a blank postcode', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(
      createPostcodesIoGeocoder({ fetchFn: failing })('SW1A 1AA')
    ).resolves.toBeUndefined();

    const unused = vi.fn();
    await expect(createPostcodesIoGeocoder({ fetchFn: unused })('  ')).resolves.toBeUndefined();
    expect(unused).not.toHaveBeenCalled();
  });
});
