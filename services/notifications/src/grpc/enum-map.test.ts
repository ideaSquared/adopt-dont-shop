import { NotificationsV1 } from '@adopt-dont-shop/proto';
import { describe, expect, it } from 'vitest';

import {
  channelFromDb,
  channelToDb,
  priorityFromDb,
  priorityToDb,
  relatedEntityTypeFromDb,
  relatedEntityTypeToDb,
  statusFromDb,
  statusToDb,
  typeFromDb,
  typeToDb,
} from './enum-map.js';

describe('enum-map round-trip', () => {
  // For each enum: walk every defined value, map to DB, map back,
  // assert identity. This is the single most valuable test in this
  // file — a missed entry in either direction (proto → DB or back)
  // surfaces immediately, including new values added later when the
  // .proto / migration expands.

  it('NotificationType round-trips for every defined value', () => {
    const values = realEnumValues(NotificationsV1.NotificationType);
    expect(values).toHaveLength(16);
    for (const v of values) {
      expect(typeFromDb(typeToDb(v))).toBe(v);
    }
  });

  it('NotificationChannel round-trips for every defined value', () => {
    const values = realEnumValues(NotificationsV1.NotificationChannel);
    expect(values).toHaveLength(4);
    for (const v of values) {
      expect(channelFromDb(channelToDb(v))).toBe(v);
    }
  });

  it('NotificationPriority round-trips for every defined value', () => {
    const values = realEnumValues(NotificationsV1.NotificationPriority);
    expect(values).toHaveLength(4);
    for (const v of values) {
      expect(priorityFromDb(priorityToDb(v))).toBe(v);
    }
  });

  it('NotificationStatus round-trips for every defined value', () => {
    const values = realEnumValues(NotificationsV1.NotificationStatus);
    expect(values).toHaveLength(6);
    for (const v of values) {
      expect(statusFromDb(statusToDb(v))).toBe(v);
    }
  });

  it('NotificationRelatedEntityType round-trips for every defined value', () => {
    const values = realEnumValues(NotificationsV1.NotificationRelatedEntityType);
    expect(values).toHaveLength(14);
    for (const v of values) {
      expect(relatedEntityTypeFromDb(relatedEntityTypeToDb(v))).toBe(v);
    }
  });

  it('typeFromDb throws on an unknown DB value', () => {
    expect(() => typeFromDb('not_a_real_type')).toThrow(/unknown notification type/);
  });

  it('channelFromDb throws on an unknown DB value', () => {
    expect(() => channelFromDb('telegram')).toThrow(/unknown notification channel/);
  });

  it('priorityFromDb maps the four levels to their proto equivalents in the documented order', () => {
    expect(priorityFromDb('low')).toBe(
      NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_LOW
    );
    expect(priorityFromDb('normal')).toBe(
      NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL
    );
    expect(priorityFromDb('high')).toBe(
      NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_HIGH
    );
    expect(priorityFromDb('urgent')).toBe(
      NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_URGENT
    );
  });

  it('statusToDb maps the proto enum back to the migration ENUM string', () => {
    expect(statusToDb(NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_PENDING)).toBe(
      'pending'
    );
    expect(statusToDb(NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_READ)).toBe('read');
    expect(statusToDb(NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_CANCELLED)).toBe(
      'cancelled'
    );
  });
});

// ts-proto emits proto3 enums with two sentinels we don't map:
//   - <PREFIX>_UNSPECIFIED = 0 (the proto3-required zero value)
//   - UNRECOGNIZED = -1 (ts-proto's "value we didn't know about" marker)
// Both are filtered out here so the round-trip tests only exercise the
// real enum entries.
function realEnumValues(e: object): number[] {
  return Object.values(e).filter((v): v is number => typeof v === 'number' && v > 0);
}
