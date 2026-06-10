import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import { NotificationsV1 } from '@adopt-dont-shop/proto';

import {
  cleanupExpiredNotifications,
  deleteNotification,
  getNotification,
  getNotificationPreferences,
  getUnreadCount,
  markAllRead,
  resetNotificationPreferences,
  updateNotificationPreferences,
} from './notification-prefs-handlers.js';

// --- Principals -------------------------------------------------------

const ADOPTER: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: [
    'notifications.read' as Permission,
    'notifications.update' as Permission,
    'notifications.delete' as Permission,
    'notifications.prefs.read' as Permission,
    'notifications.prefs.update' as Permission,
  ],
};

const ADMIN_ANY: Principal = {
  userId: 'svc-admin' as UserId,
  roles: ['admin'],
  permissions: [
    'notifications.read' as Permission,
    'notifications.update' as Permission,
    'notifications.delete' as Permission,
    'notifications.prefs.read' as Permission,
    'notifications.prefs.read:any' as Permission,
    'notifications.prefs.update' as Permission,
    'notifications.prefs.update:any' as Permission,
  ],
};

const NO_PERMS: Principal = {
  userId: 'usr-nobody' as UserId,
  roles: [],
  permissions: [],
};

// --- Mock pool/client/nats -------------------------------------------

function makeMocks() {
  const clientScript: Array<{ rows: unknown[]; rowCount?: number }> = [];
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
  const poolScript: Array<{ rows: unknown[]; rowCount?: number }> = [];
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(async () => {
      const next = poolScript.shift();
      if (!next) {
        return { rows: [] };
      }
      return next;
    }),
  };
  const natsPublish = vi.fn();
  // JetStream publish routes to the same spy so existing publish assertions
  // keep working; withTransaction now publishes via nats.jetstream().publish().
  const nats = { publish: natsPublish, jetstream: () => ({ publish: natsPublish }) };
  return {
    pool: pool as unknown as Pool,
    client: client as unknown as PoolClient,
    nats: nats as unknown as NatsConnection,
    poolMock: pool,
    clientMock: client,
    natsMock: nats,
    clientScript,
    poolScript,
    deps: {
      pool: pool as unknown as Pool,
      nats: nats as unknown as NatsConnection,
    },
  };
}

// --- Fixtures ---------------------------------------------------------

const notifRow = (overrides: Record<string, unknown> = {}) => ({
  notification_id: 'n-1',
  user_id: 'usr-adopter',
  type: 'system_announcement',
  channel: 'in_app',
  priority: 'normal',
  status: 'pending',
  title: 'T',
  message: 'M',
  data: {},
  template_id: null,
  template_variables: {},
  related_entity_type: null,
  related_entity_id: null,
  scheduled_for: null,
  sent_at: null,
  delivered_at: null,
  read_at: null,
  clicked_at: null,
  expires_at: null,
  retry_count: 0,
  max_retries: 3,
  error_message: null,
  external_id: null,
  deleted_at: null,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

const prefsRow = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'usr-adopter',
  email_enabled: true,
  push_enabled: true,
  sms_enabled: false,
  digest_frequency: 'weekly' as const,
  application_updates: true,
  pet_matches: true,
  rescue_updates: true,
  chat_messages: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: 'UTC',
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

// --- getNotification --------------------------------------------------

describe('getNotification', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects missing notification_id', async () => {
    await expect(
      getNotification(mocks.deps, ADOPTER, { notificationId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('returns NOT_FOUND for non-existent notification', async () => {
    mocks.poolScript.push({ rows: [] });
    await expect(
      getNotification(mocks.deps, ADOPTER, { notificationId: 'missing' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it("returns NOT_FOUND (no enumeration) for another user's notification", async () => {
    mocks.poolScript.push({ rows: [notifRow({ user_id: 'usr-someone-else' })] });
    await expect(
      getNotification(mocks.deps, ADOPTER, { notificationId: 'n-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns the row for the owner', async () => {
    mocks.poolScript.push({ rows: [notifRow()] });
    const res = await getNotification(mocks.deps, ADOPTER, { notificationId: 'n-1' });
    expect(res.notification?.notificationId).toBe('n-1');
    expect(res.notification?.userId).toBe('usr-adopter');
  });

  it('lets admin (super_admin role) read any user’s notification', async () => {
    const superAdmin: Principal = {
      userId: 'svc-super' as UserId,
      roles: ['super_admin'],
      permissions: [],
    };
    mocks.poolScript.push({ rows: [notifRow({ user_id: 'usr-other' })] });
    const res = await getNotification(mocks.deps, superAdmin, { notificationId: 'n-1' });
    expect(res.notification?.userId).toBe('usr-other');
  });
});

// --- getUnreadCount --------------------------------------------------

describe('getUnreadCount', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without notifications.read', async () => {
    await expect(getUnreadCount(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns the count for the calling principal', async () => {
    mocks.poolScript.push({ rows: [{ count: '7' }] });
    const res = await getUnreadCount(mocks.deps, ADOPTER, {});
    expect(res.count).toBe(7);
    // Confirm the user_id binding is the principal's, not anything from the request.
    expect(mocks.poolMock.query).toHaveBeenCalled();
    const lastCall = mocks.poolMock.query.mock.calls.at(-1) as [string, unknown[]];
    expect(lastCall[1][0]).toBe('usr-adopter');
  });

  it('returns 0 when no row comes back', async () => {
    // empty poolScript → handler default 0.
    const res = await getUnreadCount(mocks.deps, ADOPTER, {});
    expect(res.count).toBe(0);
  });
});

// --- markAllRead -----------------------------------------------------

describe('markAllRead', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without notifications.update', async () => {
    await expect(markAllRead(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('updates inside withTransaction, publishes once, returns affected count', async () => {
    mocks.clientScript.push({
      rows: [{ notification_id: 'n-1' }, { notification_id: 'n-2' }, { notification_id: 'n-3' }],
      rowCount: 3,
    });

    const res = await markAllRead(mocks.deps, ADOPTER, {});

    expect(res.affectedCount).toBe(3);
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
    const [subject] = mocks.natsMock.publish.mock.calls[0];
    expect(subject).toBe('notifications.allRead');
  });

  it('returns 0 and skips publish when nothing to update', async () => {
    mocks.clientScript.push({ rows: [], rowCount: 0 });
    const res = await markAllRead(mocks.deps, ADOPTER, {});
    expect(res.affectedCount).toBe(0);
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });
});

// --- deleteNotification ----------------------------------------------

describe('deleteNotification', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects missing notification_id', async () => {
    await expect(
      deleteNotification(mocks.deps, ADOPTER, { notificationId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('returns NOT_FOUND when row missing', async () => {
    mocks.poolScript.push({ rows: [] });
    await expect(
      deleteNotification(mocks.deps, ADOPTER, { notificationId: 'missing' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it("returns NOT_FOUND (no enumeration) for another user's row", async () => {
    mocks.poolScript.push({ rows: [notifRow({ user_id: 'usr-other' })] });
    await expect(
      deleteNotification(mocks.deps, ADOPTER, { notificationId: 'n-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('is idempotent on an already-deleted row (no write, no publish)', async () => {
    mocks.poolScript.push({
      rows: [notifRow({ deleted_at: new Date('2026-05-01T00:00:00Z') })],
    });
    const res = await deleteNotification(mocks.deps, ADOPTER, { notificationId: 'n-1' });
    expect(res.notification?.notificationId).toBe('n-1');
    expect(mocks.clientMock.query).not.toHaveBeenCalled();
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('soft-deletes inside withTransaction and publishes notifications.deleted', async () => {
    mocks.poolScript.push({ rows: [notifRow()] });
    mocks.clientScript.push({ rows: [notifRow({ deleted_at: new Date() })] });

    const res = await deleteNotification(mocks.deps, ADOPTER, { notificationId: 'n-1' });
    expect(res.notification?.notificationId).toBe('n-1');
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
    const [subject] = mocks.natsMock.publish.mock.calls[0];
    expect(subject).toBe('notifications.deleted');
  });
});

// --- getNotificationPreferences --------------------------------------

describe('getNotificationPreferences', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without notifications.prefs.read', async () => {
    await expect(getNotificationPreferences(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('returns the existing row for the calling principal', async () => {
    mocks.poolScript.push({ rows: [prefsRow()] });
    const res = await getNotificationPreferences(mocks.deps, ADOPTER, {});
    expect(res.preferences?.userId).toBe('usr-adopter');
    expect(res.preferences?.emailEnabled).toBe(true);
    expect(res.preferences?.digestFrequency).toBe(
      NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_WEEKLY
    );
  });

  it('auto-creates a defaults row on first read', async () => {
    mocks.poolScript.push({ rows: [] }); // SELECT
    mocks.poolScript.push({ rows: [prefsRow()] }); // INSERT ... RETURNING
    const res = await getNotificationPreferences(mocks.deps, ADOPTER, {});
    expect(res.preferences?.userId).toBe('usr-adopter');
  });

  it('rejects cross-user read without :any', async () => {
    await expect(
      getNotificationPreferences(mocks.deps, ADOPTER, { userId: 'usr-other' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('allows cross-user read when principal has :any', async () => {
    mocks.poolScript.push({ rows: [prefsRow({ user_id: 'usr-other' })] });
    const res = await getNotificationPreferences(mocks.deps, ADMIN_ANY, { userId: 'usr-other' });
    expect(res.preferences?.userId).toBe('usr-other');
  });
});

// --- updateNotificationPreferences -----------------------------------

describe('updateNotificationPreferences', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without notifications.prefs.update', async () => {
    await expect(updateNotificationPreferences(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('rejects malformed quiet_hours_start', async () => {
    mocks.poolScript.push({ rows: [prefsRow()] }); // findOrCreate SELECT
    await expect(
      updateNotificationPreferences(mocks.deps, ADOPTER, { quietHoursStart: '99:99' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('writes only the boolean fields that were set', async () => {
    mocks.poolScript.push({ rows: [prefsRow()] }); // findOrCreate SELECT
    mocks.poolScript.push({
      rows: [prefsRow({ email_enabled: false, push_enabled: false })],
    }); // UPDATE RETURNING

    const res = await updateNotificationPreferences(mocks.deps, ADOPTER, {
      emailEnabled: false,
      pushEnabled: false,
    });

    expect(res.preferences?.emailEnabled).toBe(false);
    expect(res.preferences?.pushEnabled).toBe(false);

    // Confirm the UPDATE only sets the two columns (plus updated_at + version).
    const updateCall = mocks.poolMock.query.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' && sql.includes('UPDATE notifications.user_notification_prefs')
    );
    expect(updateCall).toBeDefined();
    const sql = updateCall![0] as string;
    expect(sql).toContain('email_enabled = $1');
    expect(sql).toContain('push_enabled = $2');
    expect(sql).not.toContain('sms_enabled');
    expect(sql).not.toContain('application_updates');
  });

  it('clears quiet_hours when empty string passed', async () => {
    mocks.poolScript.push({ rows: [prefsRow({ quiet_hours_start: '22:00' })] });
    mocks.poolScript.push({ rows: [prefsRow({ quiet_hours_start: null })] });

    const res = await updateNotificationPreferences(mocks.deps, ADOPTER, {
      quietHoursStart: '',
    });

    expect(res.preferences?.quietHoursStart).toBeUndefined();

    const updateCall = mocks.poolMock.query.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' && sql.includes('UPDATE notifications.user_notification_prefs')
    );
    expect(updateCall).toBeDefined();
    const params = updateCall![1] as unknown[];
    // First parameter set is null (clear).
    expect(params[0]).toBeNull();
  });

  it('maps digest_frequency proto enum to db value', async () => {
    mocks.poolScript.push({ rows: [prefsRow()] });
    mocks.poolScript.push({ rows: [prefsRow({ digest_frequency: 'daily' })] });

    const res = await updateNotificationPreferences(mocks.deps, ADOPTER, {
      digestFrequency:
        NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_DAILY,
    });

    expect(res.preferences?.digestFrequency).toBe(
      NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_DAILY
    );
  });

  it('no-op patch returns current row without UPDATE', async () => {
    mocks.poolScript.push({ rows: [prefsRow()] }); // findOrCreate
    mocks.poolScript.push({ rows: [prefsRow()] }); // SELECT current
    const res = await updateNotificationPreferences(mocks.deps, ADOPTER, {});
    expect(res.preferences?.userId).toBe('usr-adopter');
    const updateCalls = mocks.poolMock.query.mock.calls.filter(
      ([sql]) =>
        typeof sql === 'string' && sql.includes('UPDATE notifications.user_notification_prefs')
    );
    expect(updateCalls).toHaveLength(0);
  });

  it('rejects cross-user write without :any', async () => {
    await expect(
      updateNotificationPreferences(mocks.deps, ADOPTER, {
        userId: 'usr-other',
        emailEnabled: false,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

// --- resetNotificationPreferences ------------------------------------

describe('resetNotificationPreferences', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without notifications.prefs.update', async () => {
    await expect(resetNotificationPreferences(mocks.deps, NO_PERMS, {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('deletes + inserts defaults inside withTransaction, publishes once', async () => {
    mocks.clientScript.push({ rows: [] }); // DELETE
    mocks.clientScript.push({ rows: [prefsRow()] }); // INSERT RETURNING

    const res = await resetNotificationPreferences(mocks.deps, ADOPTER, {});

    expect(res.preferences?.userId).toBe('usr-adopter');
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
    expect(mocks.natsMock.publish.mock.calls[0][0]).toBe('notifications.prefsReset');
  });

  it('rejects cross-user reset without :any', async () => {
    await expect(
      resetNotificationPreferences(mocks.deps, ADOPTER, { userId: 'usr-other' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });
});

// --- cleanupExpiredNotifications ------------------------------------

describe('cleanupExpiredNotifications', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects principals without notifications.cleanup', async () => {
    await expect(
      cleanupExpiredNotifications(mocks.deps, ADOPTER, { daysToKeep: 30 })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects out-of-range days_to_keep', async () => {
    const admin: Principal = {
      userId: 'svc-admin' as UserId,
      roles: ['admin'],
      permissions: ['notifications.cleanup' as Permission],
    };
    await expect(
      cleanupExpiredNotifications(mocks.deps, admin, { daysToKeep: 4000 })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('returns the deleted row count from the UPDATE', async () => {
    const admin: Principal = {
      userId: 'svc-admin' as UserId,
      roles: ['admin'],
      permissions: ['notifications.cleanup' as Permission],
    };
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [{ notification_id: 'n-1' }, { notification_id: 'n-2' }],
      rowCount: 2,
    });
    const res = await cleanupExpiredNotifications(mocks.deps, admin, { daysToKeep: 30 });
    expect(res.deletedCount).toBe(2);

    // Confirm days_to_keep is passed as the first parameter (stringified for interval).
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).toEqual(['30']);
  });

  it('defaults to 30 days when days_to_keep is 0', async () => {
    const admin: Principal = {
      userId: 'svc-admin' as UserId,
      roles: ['admin'],
      permissions: ['notifications.cleanup' as Permission],
    };
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    await cleanupExpiredNotifications(mocks.deps, admin, { daysToKeep: 0 });
    const call = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(call[1]).toEqual(['30']);
  });
});
