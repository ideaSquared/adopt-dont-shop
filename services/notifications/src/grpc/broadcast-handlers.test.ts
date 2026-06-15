import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from 'winston';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { NotificationsV1 } from '@adopt-dont-shop/proto';

import { broadcast, isInQuietHours } from './broadcast-handlers.js';
import type { AuthCohortClient, HandlerDeps } from './handlers.js';

const BROADCASTER: Principal = {
  userId: 'svc-bcast' as UserId,
  roles: ['admin'],
  permissions: ['admin.notifications.broadcast' as Permission],
};

const NO_PERMS: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: [],
  permissions: [],
};

function makeMocks(authClient?: AuthCohortClient, logger?: Logger) {
  const clientScript: Array<{ rows: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      const next = clientScript.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    }),
    release: vi.fn(),
  };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(),
  };
  const natsPublish = vi.fn();
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
    authClient,
    logger,
  };
  return { deps, poolMock: pool, clientMock: client, natsMock: nats, clientScript };
}

const prefsRow = (over: Record<string, unknown> = {}) => ({
  user_id: 'u-1',
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: 'UTC',
  ...over,
});

describe('broadcast', () => {
  it('rejects callers without admin.notifications.broadcast', async () => {
    const mocks = makeMocks();
    await expect(
      broadcast(mocks.deps, NO_PERMS, {
        cohort: { userTypes: [], statuses: [] },
        type: 0,
        title: 't',
        message: 'm',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects when no auth client is wired', async () => {
    const mocks = makeMocks(undefined);
    await expect(
      broadcast(mocks.deps, BROADCASTER, {
        cohort: { userTypes: [], statuses: [] },
        type: 0,
        title: 't',
        message: 'm',
      })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('rejects empty title / message with INVALID_ARGUMENT', async () => {
    const authClient: AuthCohortClient = {
      listUserIdsByCohort: vi.fn(),
    };
    const mocks = makeMocks(authClient);
    await expect(
      broadcast(mocks.deps, BROADCASTER, {
        cohort: { userTypes: [], statuses: [] },
        type: 0,
        title: '',
        message: 'm',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    await expect(
      broadcast(mocks.deps, BROADCASTER, {
        cohort: { userTypes: [], statuses: [] },
        type: 0,
        title: 't',
        message: '   ',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('fans out to the cohort and counts delivered / suppressed / failed', async () => {
    const authClient: AuthCohortClient = {
      listUserIdsByCohort: vi.fn().mockResolvedValue({
        userIds: ['u-1', 'u-2', 'u-3'],
        total: 3,
        page: 1,
        totalPages: 1,
      }),
    };
    const mocks = makeMocks(authClient);
    // u-1: prefs (no DND), insert
    mocks.clientScript.push({ rows: [prefsRow({ user_id: 'u-1' })] });
    mocks.clientScript.push({ rows: [] }); // INSERT notification
    // u-2: prefs with active DND window (always-on)
    mocks.clientScript.push({
      rows: [
        prefsRow({
          user_id: 'u-2',
          quiet_hours_start: '00:00',
          quiet_hours_end: '23:59',
          timezone: 'UTC',
        }),
      ],
    });
    // u-3: prefs, insert
    mocks.clientScript.push({ rows: [prefsRow({ user_id: 'u-3' })] });
    mocks.clientScript.push({ rows: [] });

    const res = await broadcast(mocks.deps, BROADCASTER, {
      cohort: { userTypes: ['adopter'], statuses: [], emailVerified: true },
      type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_SYSTEM_ANNOUNCEMENT,
      title: 'Maintenance',
      message: 'Brief downtime tonight',
    });

    expect(res.targeted).toBe(3);
    expect(res.delivered).toBe(2);
    expect(res.suppressed).toBe(1);
    expect(res.failed).toBe(0);

    // Cohort lookup used the mapped enum values.
    const cohortReq = (authClient.listUserIdsByCohort as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(cohortReq.userTypes).toEqual([1]); // USER_ROLE_ADOPTER
    expect(cohortReq.emailVerified).toBe(true);
  });

  it('counts INSERT failures into failed and continues the loop', async () => {
    const authClient: AuthCohortClient = {
      listUserIdsByCohort: vi.fn().mockResolvedValue({
        userIds: ['u-1', 'u-2'],
        total: 2,
        page: 1,
        totalPages: 1,
      }),
    };
    const mocks = makeMocks(authClient);
    // Replace the default query stub with one that throws on the FIRST
    // INSERT INTO notifications.notifications (u-1's). u-2's INSERT
    // succeeds. BEGIN/COMMIT/ROLLBACK still no-op; SELECT/UPSERT prefs
    // still drain from clientScript.
    let insertCount = 0;
    mocks.clientMock.query = vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO notifications.notifications')) {
        insertCount++;
        if (insertCount === 1) {
          throw new Error('boom');
        }
        return { rows: [] };
      }
      // prefs UPSERT
      const next = mocks.clientScript.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    });
    mocks.clientScript.push({ rows: [prefsRow({ user_id: 'u-1' })] });
    mocks.clientScript.push({ rows: [prefsRow({ user_id: 'u-2' })] });

    const res = await broadcast(mocks.deps, BROADCASTER, {
      cohort: { userTypes: [], statuses: [] },
      type: 0,
      title: 't',
      message: 'm',
    });

    expect(res.delivered).toBe(1);
    expect(res.failed).toBe(1);
  });

  it('logs a warn with the userId and error message when a recipient write fails', async () => {
    const authClient: AuthCohortClient = {
      listUserIdsByCohort: vi.fn().mockResolvedValue({
        userIds: ['u-1', 'u-2'],
        total: 2,
        page: 1,
        totalPages: 1,
      }),
    };
    const warn = vi.fn();
    const logger = { warn } as unknown as Logger;
    const mocks = makeMocks(authClient, logger);
    // u-1's INSERT throws; u-2's succeeds.
    let insertCount = 0;
    mocks.clientMock.query = vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO notifications.notifications')) {
        insertCount++;
        if (insertCount === 1) {
          throw new Error('boom');
        }
        return { rows: [] };
      }
      const next = mocks.clientScript.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    });
    mocks.clientScript.push({ rows: [prefsRow({ user_id: 'u-1' })] });
    mocks.clientScript.push({ rows: [prefsRow({ user_id: 'u-2' })] });

    const res = await broadcast(mocks.deps, BROADCASTER, {
      cohort: { userTypes: [], statuses: [] },
      type: 0,
      title: 't',
      message: 'm',
    });

    expect(res.delivered).toBe(1);
    expect(res.failed).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('broadcast recipient write failed', {
      userId: 'u-1',
      error: 'boom',
    });
  });

  it('caps failure logging at 50 entries per broadcast', async () => {
    const userIds = Array.from({ length: 60 }, (_, i) => `u-${i}`);
    const authClient: AuthCohortClient = {
      listUserIdsByCohort: vi.fn().mockResolvedValue({
        userIds,
        total: userIds.length,
        page: 1,
        totalPages: 1,
      }),
    };
    const warn = vi.fn();
    const logger = { warn } as unknown as Logger;
    const mocks = makeMocks(authClient, logger);
    // Every INSERT fails; prefs upserts succeed for everyone.
    mocks.clientMock.query = vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO notifications.notifications')) {
        throw new Error('boom');
      }
      return { rows: [prefsRow()] };
    });

    const res = await broadcast(mocks.deps, BROADCASTER, {
      cohort: { userTypes: [], statuses: [] },
      type: 0,
      title: 't',
      message: 'm',
    });

    expect(res.failed).toBe(60);
    expect(warn).toHaveBeenCalledTimes(50);
  });

  it('defers when scheduledFor is set (passes Date through to INSERT)', async () => {
    const authClient: AuthCohortClient = {
      listUserIdsByCohort: vi.fn().mockResolvedValue({
        userIds: ['u-1'],
        total: 1,
        page: 1,
        totalPages: 1,
      }),
    };
    const mocks = makeMocks(authClient);
    mocks.clientScript.push({ rows: [prefsRow({ user_id: 'u-1' })] });
    mocks.clientScript.push({ rows: [] });

    await broadcast(mocks.deps, BROADCASTER, {
      cohort: { userTypes: [], statuses: [] },
      type: 0,
      title: 't',
      message: 'm',
      scheduledFor: '2030-01-01T00:00:00Z',
    });

    const insertCall = mocks.clientMock.query.mock.calls.find(c =>
      String(c[0]).includes('INSERT INTO notifications.notifications')
    );
    const params = insertCall![1] as unknown[];
    // scheduled_for is the 7th param ($7).
    expect(params[6]).toBeInstanceOf(Date);
  });

  it('rejects invalid scheduledFor with INVALID_ARGUMENT', async () => {
    const authClient: AuthCohortClient = {
      listUserIdsByCohort: vi.fn(),
    };
    const mocks = makeMocks(authClient);
    await expect(
      broadcast(mocks.deps, BROADCASTER, {
        cohort: { userTypes: [], statuses: [] },
        type: 0,
        title: 't',
        message: 'm',
        scheduledFor: 'not a date',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});

describe('isInQuietHours', () => {
  it('returns false when no DND window is set', () => {
    expect(
      isInQuietHours({
        user_id: 'u',
        quiet_hours_start: null,
        quiet_hours_end: null,
        timezone: 'UTC',
      })
    ).toBe(false);
  });

  it('detects in-window for a normal (non-wrapping) range', () => {
    // 13:30 UTC inside 12:00–14:00.
    const noon = new Date('2026-06-01T13:30:00Z');
    expect(
      isInQuietHours(
        {
          user_id: 'u',
          quiet_hours_start: '12:00',
          quiet_hours_end: '14:00',
          timezone: 'UTC',
        },
        noon
      )
    ).toBe(true);
  });

  it('detects in-window for a wrap-midnight range (22:00 → 07:00)', () => {
    const lateNight = new Date('2026-06-01T23:30:00Z');
    expect(
      isInQuietHours(
        {
          user_id: 'u',
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
          timezone: 'UTC',
        },
        lateNight
      )
    ).toBe(true);

    const earlyMorning = new Date('2026-06-01T03:00:00Z');
    expect(
      isInQuietHours(
        {
          user_id: 'u',
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
          timezone: 'UTC',
        },
        earlyMorning
      )
    ).toBe(true);

    const noonAgain = new Date('2026-06-01T12:00:00Z');
    expect(
      isInQuietHours(
        {
          user_id: 'u',
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
          timezone: 'UTC',
        },
        noonAgain
      )
    ).toBe(false);
  });

  it('handles Postgres time values that include seconds (HH:MM:SS)', () => {
    // pg returns `time` columns as 'HH:MM:SS'; the localised "now" is
    // HH:MM. Comparison must normalise so the boundary minute is correct.
    // 22:00 UTC is the exact start of a 22:00:00 → 07:00:00 window.
    const exactStart = new Date('2026-06-01T22:00:00Z');
    expect(
      isInQuietHours(
        {
          user_id: 'u',
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '07:00:00',
          timezone: 'UTC',
        },
        exactStart
      )
    ).toBe(true);

    // 21:59 UTC is one minute before the window — must NOT be suppressed.
    const justBefore = new Date('2026-06-01T21:59:00Z');
    expect(
      isInQuietHours(
        {
          user_id: 'u',
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '07:00:00',
          timezone: 'UTC',
        },
        justBefore
      )
    ).toBe(false);
  });

  it('falls back to UTC when timezone is unknown', () => {
    expect(
      isInQuietHours(
        {
          user_id: 'u',
          quiet_hours_start: '00:00',
          quiet_hours_end: '23:59',
          timezone: 'Not/A_Zone',
        },
        new Date('2026-06-01T12:00:00Z')
      )
    ).toBe(true);
  });
});
