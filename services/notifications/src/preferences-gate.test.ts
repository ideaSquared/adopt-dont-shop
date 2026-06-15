import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_PREFS,
  inQuietHours,
  loadNotificationPrefs,
  shouldDeliver,
  type NotificationPrefs,
} from './preferences-gate.js';

const prefs = (overrides: Partial<NotificationPrefs> = {}): NotificationPrefs => ({
  ...DEFAULT_PREFS,
  ...overrides,
});

describe('shouldDeliver', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it('always allows the in-app record regardless of channel/category prefs', () => {
    const muted = prefs({ pushEnabled: false, chatMessages: false, applicationUpdates: false });
    expect(shouldDeliver(muted, { type: 'message_received', channel: 'in_app', now })).toBe(true);
  });

  it('allows push when the channel and category are both enabled', () => {
    expect(shouldDeliver(prefs(), { type: 'application_status', channel: 'push', now })).toBe(true);
  });

  it('suppresses push when push is disabled', () => {
    expect(
      shouldDeliver(prefs({ pushEnabled: false }), {
        type: 'application_status',
        channel: 'push',
        now,
      })
    ).toBe(false);
  });

  it('suppresses push when the matching category is muted', () => {
    expect(
      shouldDeliver(prefs({ chatMessages: false }), {
        type: 'message_received',
        channel: 'push',
        now,
      })
    ).toBe(false);
  });

  it('gates email on email_enabled, independent of push', () => {
    const p = prefs({ emailEnabled: false, pushEnabled: true });
    expect(shouldDeliver(p, { type: 'application_status', channel: 'email', now })).toBe(false);
  });

  it('gates sms on sms_enabled (off by default)', () => {
    expect(shouldDeliver(prefs(), { type: 'application_status', channel: 'sms', now })).toBe(false);
    expect(
      shouldDeliver(prefs({ smsEnabled: true }), {
        type: 'application_status',
        channel: 'sms',
        now,
      })
    ).toBe(true);
  });

  it('never category-mutes account_security, but still respects the channel toggle', () => {
    // Category bypass: a security alert is not governed by any category flag.
    expect(shouldDeliver(prefs(), { type: 'account_security', channel: 'push', now })).toBe(true);
    // Channel toggle still applies — push off means no push, even for security.
    expect(
      shouldDeliver(prefs({ pushEnabled: false }), {
        type: 'account_security',
        channel: 'push',
        now,
      })
    ).toBe(false);
  });

  it('suppresses push during quiet hours but not other channels', () => {
    const p = prefs({ quietHoursStart: '22:00:00', quietHoursEnd: '07:00:00', timezone: 'UTC' });
    const night = new Date('2026-06-15T23:30:00Z');
    expect(shouldDeliver(p, { type: 'application_status', channel: 'push', now: night })).toBe(
      false
    );
    // Email is not quiet-hours gated.
    expect(shouldDeliver(p, { type: 'application_status', channel: 'email', now: night })).toBe(
      true
    );
  });
});

describe('inQuietHours', () => {
  it('returns false when no window is configured', () => {
    expect(inQuietHours(prefs(), new Date('2026-06-15T23:30:00Z'))).toBe(false);
  });

  it('handles a window that wraps midnight (22:00 → 07:00)', () => {
    const p = prefs({ quietHoursStart: '22:00:00', quietHoursEnd: '07:00:00', timezone: 'UTC' });
    expect(inQuietHours(p, new Date('2026-06-15T23:30:00Z'))).toBe(true); // late night
    expect(inQuietHours(p, new Date('2026-06-15T05:00:00Z'))).toBe(true); // early morning
    expect(inQuietHours(p, new Date('2026-06-15T12:00:00Z'))).toBe(false); // midday
  });

  it('handles a same-day window (09:00 → 17:00)', () => {
    const p = prefs({ quietHoursStart: '09:00:00', quietHoursEnd: '17:00:00', timezone: 'UTC' });
    expect(inQuietHours(p, new Date('2026-06-15T12:00:00Z'))).toBe(true);
    expect(inQuietHours(p, new Date('2026-06-15T20:00:00Z'))).toBe(false);
  });

  it('evaluates the window in the user timezone, not UTC', () => {
    // 23:30 UTC is 19:30 in New York — outside a 22:00→07:00 NY window.
    const p = prefs({
      quietHoursStart: '22:00:00',
      quietHoursEnd: '07:00:00',
      timezone: 'America/New_York',
    });
    expect(inQuietHours(p, new Date('2026-06-15T23:30:00Z'))).toBe(false);
    // 03:30 UTC is 23:30 the previous day in NY — inside the window.
    expect(inQuietHours(p, new Date('2026-06-15T03:30:00Z'))).toBe(true);
  });
});

describe('loadNotificationPrefs', () => {
  it('maps a stored row to camelCase prefs', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          email_enabled: false,
          push_enabled: true,
          sms_enabled: true,
          application_updates: false,
          pet_matches: true,
          rescue_updates: true,
          chat_messages: false,
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '07:00:00',
          timezone: 'Europe/London',
        },
      ],
    });
    const pool = { query } as unknown as Pool;

    const result = await loadNotificationPrefs(pool, 'usr-1');

    expect(result).toEqual({
      emailEnabled: false,
      pushEnabled: true,
      smsEnabled: true,
      applicationUpdates: false,
      petMatches: true,
      rescueUpdates: true,
      chatMessages: false,
      quietHoursStart: '22:00:00',
      quietHoursEnd: '07:00:00',
      timezone: 'Europe/London',
    });
  });

  it('returns permissive defaults when the user has no prefs row', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as Pool;

    expect(await loadNotificationPrefs(pool, 'usr-new')).toEqual(DEFAULT_PREFS);
  });
});
