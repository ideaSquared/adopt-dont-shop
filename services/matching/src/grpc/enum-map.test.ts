import { describe, expect, it } from 'vitest';

import { MatchingV1 } from '@adopt-dont-shop/proto';

import {
  ALL_DEVICE_TYPES,
  ALL_SWIPE_ACTIONS,
  deviceTypeFromDb,
  deviceTypeToDb,
  swipeActionFromDb,
  swipeActionToDb,
} from './enum-map.js';

// Bite #10: ts-proto adds UNRECOGNIZED = -1; UNSPECIFIED = 0 is the
// proto3 sentinel. Filter both with `v > 0`.
function populatedCount(enumObj: Record<string, string | number>): number {
  return Object.values(enumObj).filter(v => typeof v === 'number' && v > 0).length;
}

describe('SwipeAction mapping', () => {
  it.each(ALL_SWIPE_ACTIONS)('round-trips %s', db => {
    expect(swipeActionToDb(swipeActionFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() => swipeActionToDb(MatchingV1.SwipeAction.SWIPE_ACTION_UNSPECIFIED)).toThrowError();
    expect(() => swipeActionFromDb('block')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(MatchingV1.SwipeAction)).toBe(ALL_SWIPE_ACTIONS.length);
  });
});

describe('DeviceType mapping', () => {
  it.each(ALL_DEVICE_TYPES)('round-trips %s', db => {
    expect(deviceTypeToDb(deviceTypeFromDb(db))).toBe(db);
  });

  it('throws on UNSPECIFIED + unknown DB value', () => {
    expect(() => deviceTypeToDb(MatchingV1.DeviceType.DEVICE_TYPE_UNSPECIFIED)).toThrowError();
    expect(() => deviceTypeFromDb('watch')).toThrowError();
  });

  it('proto-populated count matches DB variant count', () => {
    expect(populatedCount(MatchingV1.DeviceType)).toBe(ALL_DEVICE_TYPES.length);
  });
});
