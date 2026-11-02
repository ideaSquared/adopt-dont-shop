import { describe, expect, it, vi } from 'vitest';

import { Metadata } from '@grpc/grpc-js';

import type { RescueClient } from '../grpc-clients/rescue-client.js';

import { readUserLocation, withDistances } from './pets-distance.js';

const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const MANCHESTER = { latitude: 53.4808, longitude: -2.2426 };
const meta = new Metadata();

const makeRescueClient = (getRescueLocations: ReturnType<typeof vi.fn>): RescueClient =>
  ({ getRescueLocations }) as unknown as RescueClient;

describe('readUserLocation', () => {
  it('reads lat/lng query values', () => {
    expect(readUserLocation({ lat: '51.5', lng: '-0.12' })).toEqual({
      latitude: 51.5,
      longitude: -0.12,
    });
  });

  it.each([
    [{}],
    [{ lat: '51.5' }],
    [{ lat: 'abc', lng: '1' }],
    [{ lat: '91', lng: '0' }],
    [{ lat: '0', lng: '181' }],
  ])('treats %j as no location rather than an error', query => {
    expect(readUserLocation(query)).toBeUndefined();
  });
});

describe('withDistances', () => {
  const views = [
    { pet_id: 'p-1', rescue_id: 'rsc-1' },
    { pet_id: 'p-2', rescue_id: 'rsc-2' },
    { pet_id: 'p-3', rescue_id: 'rsc-1' },
    { pet_id: 'p-4' },
  ];

  it('adds miles (one decimal) for pets whose rescue has coordinates, once per rescue', async () => {
    const getRescueLocations = vi
      .fn()
      .mockResolvedValue({ locations: [{ rescueId: 'rsc-1', ...MANCHESTER }] });

    const out = await withDistances(views, LONDON, makeRescueClient(getRescueLocations), meta);

    expect(getRescueLocations).toHaveBeenCalledTimes(1);
    const [req, , budget] = getRescueLocations.mock.calls[0];
    expect(req.rescueIds.sort()).toEqual(['rsc-1', 'rsc-2']);
    // Optional lookup: one short attempt, no retries.
    expect(budget).toEqual({ deadlineMs: 750, maxRetries: 0 });
    expect(out[0].distance).toBeGreaterThan(160);
    expect(out[0].distance).toBeLessThan(166);
    expect(Number.isInteger((out[0].distance as number) * 10)).toBe(true);
    expect(out[2].distance).toBe(out[0].distance);
    expect('distance' in out[1]).toBe(false);
    expect('distance' in out[3]).toBe(false);
  });

  it('leaves the rows untouched without a user location, without calling the rescue service', async () => {
    const getRescueLocations = vi.fn();

    const out = await withDistances(views, undefined, makeRescueClient(getRescueLocations), meta);

    expect(out).toEqual(views);
    expect(getRescueLocations).not.toHaveBeenCalled();
  });

  it('leaves the rows untouched when there is no rescue client', async () => {
    expect(await withDistances(views, LONDON, undefined, meta)).toEqual(views);
  });

  it('never fails the read when the rescue lookup fails', async () => {
    const getRescueLocations = vi.fn().mockRejectedValue(new Error('rescue down'));

    const out = await withDistances(views, LONDON, makeRescueClient(getRescueLocations), meta);

    expect(out).toEqual(views);
  });
});
