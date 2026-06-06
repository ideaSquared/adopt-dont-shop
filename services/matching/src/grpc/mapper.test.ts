import { describe, expect, it } from 'vitest';

import { MatchingV1 } from '@adopt-dont-shop/proto';

import {
  actionRowToProto,
  sessionRowToProto,
  type SwipeActionRow,
  type SwipeSessionRow,
} from './mapper.js';

function baseSessionRow(overrides: Partial<SwipeSessionRow> = {}): SwipeSessionRow {
  return {
    session_id: '11111111-1111-1111-1111-111111111111',
    user_id: '22222222-2222-2222-2222-222222222222',
    start_time: new Date('2026-06-01T12:00:00.000Z'),
    end_time: null,
    total_swipes: 5,
    likes: 2,
    passes: 2,
    super_likes: 1,
    filters: { species: 'dog' },
    ip_address: '1.2.3.4',
    user_agent: 'Mozilla/5.0',
    device_type: 'mobile',
    is_active: true,
    created_at: new Date('2026-06-01T12:00:00.000Z'),
    updated_at: new Date('2026-06-01T12:05:00.000Z'),
    ...overrides,
  };
}

describe('sessionRowToProto', () => {
  it('translates a populated open session', () => {
    const proto = sessionRowToProto(baseSessionRow());
    expect(proto).toEqual({
      sessionId: '11111111-1111-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
      startTime: '2026-06-01T12:00:00.000Z',
      totalSwipes: 5,
      likes: 2,
      passes: 2,
      superLikes: 1,
      filtersJson: '{"species":"dog"}',
      ipAddress: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
      deviceType: MatchingV1.DeviceType.DEVICE_TYPE_MOBILE,
      isActive: true,
      createdAt: '2026-06-01T12:00:00.000Z',
      updatedAt: '2026-06-01T12:05:00.000Z',
    });
  });

  it('omits userId for an anonymous browsing session', () => {
    const proto = sessionRowToProto(baseSessionRow({ user_id: null }));
    expect(proto.userId).toBeUndefined();
  });

  it('falls back to DEVICE_TYPE_UNKNOWN when device_type is NULL', () => {
    const proto = sessionRowToProto(baseSessionRow({ device_type: null }));
    expect(proto.deviceType).toBe(MatchingV1.DeviceType.DEVICE_TYPE_UNKNOWN);
  });

  it('normalises null filters to "{}"', () => {
    const proto = sessionRowToProto(baseSessionRow({ filters: null }));
    expect(proto.filtersJson).toBe('{}');
  });

  it('populates endTime for a closed session', () => {
    const proto = sessionRowToProto(
      baseSessionRow({
        is_active: false,
        end_time: new Date('2026-06-01T13:00:00.000Z'),
      })
    );
    expect(proto.isActive).toBe(false);
    expect(proto.endTime).toBe('2026-06-01T13:00:00.000Z');
  });

  it('omits ipAddress / userAgent when both NULL', () => {
    const proto = sessionRowToProto(baseSessionRow({ ip_address: null, user_agent: null }));
    expect(proto.ipAddress).toBeUndefined();
    expect(proto.userAgent).toBeUndefined();
  });
});

function baseActionRow(overrides: Partial<SwipeActionRow> = {}): SwipeActionRow {
  return {
    swipe_action_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    session_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    pet_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    user_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    action: 'super_like',
    timestamp: new Date('2026-06-01T12:01:23.456Z'),
    response_time: 1234,
    device_type: 'mobile',
    ...overrides,
  };
}

describe('actionRowToProto', () => {
  it('translates a populated swipe action', () => {
    const proto = actionRowToProto(baseActionRow());
    expect(proto).toEqual({
      swipeActionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      sessionId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      petId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      userId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      action: MatchingV1.SwipeAction.SWIPE_ACTION_SUPER_LIKE,
      timestamp: '2026-06-01T12:01:23.456Z',
      responseTime: 1234,
      deviceType: 'mobile',
    });
  });

  it('omits userId for an anonymous swipe', () => {
    const proto = actionRowToProto(baseActionRow({ user_id: null }));
    expect(proto.userId).toBeUndefined();
  });

  it('omits responseTime + deviceType when both NULL', () => {
    const proto = actionRowToProto(baseActionRow({ response_time: null, device_type: null }));
    expect(proto.responseTime).toBeUndefined();
    expect(proto.deviceType).toBeUndefined();
  });

  it.each([
    ['like', MatchingV1.SwipeAction.SWIPE_ACTION_LIKE],
    ['pass', MatchingV1.SwipeAction.SWIPE_ACTION_PASS],
    ['super_like', MatchingV1.SwipeAction.SWIPE_ACTION_SUPER_LIKE],
    ['info', MatchingV1.SwipeAction.SWIPE_ACTION_INFO],
  ] as const)('maps action %s to %i', (db, proto) => {
    const event = actionRowToProto(baseActionRow({ action: db }));
    expect(event.action).toBe(proto);
  });

  it('throws on an unknown action (schema drift guard)', () => {
    expect(() => actionRowToProto(baseActionRow({ action: 'block' }))).toThrowError();
  });
});
