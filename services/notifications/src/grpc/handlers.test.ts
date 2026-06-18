import type { Pool, PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import {
  NotificationsV1,
  type CreateNotificationRequest,
  type DismissNotificationRequest,
  type ListNotificationsRequest,
} from '@adopt-dont-shop/proto';

import { makeNatsDouble, testPrincipal } from '@adopt-dont-shop/test-utils';

import {
  createNotification,
  dismissNotification,
  HandlerError,
  listNotifications,
} from './handlers.js';

// --- Test fixtures --------------------------------------------------

const SYSTEM_PRINCIPAL = testPrincipal({
  userId: 'svc-application' as UserId,
  roles: ['admin'],
  permissions: [
    'notifications.create' as Permission,
    'notifications.read' as Permission,
    'notifications.update' as Permission,
  ],
});

const SUPER_ADMIN_PRINCIPAL = testPrincipal({
  userId: 'svc-super' as UserId,
  roles: ['super_admin'],
  permissions: [],
});

const ADOPTER_PRINCIPAL = testPrincipal({
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: ['notifications.read' as Permission, 'notifications.update' as Permission],
});

function rowFixture(overrides: Record<string, unknown> = {}) {
  return {
    notification_id: 'n-1',
    user_id: 'usr-adopter',
    type: 'application_status',
    channel: 'in_app',
    priority: 'normal',
    status: 'pending',
    title: 'Application submitted',
    message: 'Your application was received.',
    data: { applicationId: 'app-1' },
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
    created_at: new Date('2026-06-01T10:00:00Z'),
    updated_at: new Date('2026-06-01T10:00:00Z'),
    ...overrides,
  };
}

function makeMocks() {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(),
  };
  const nat = makeNatsDouble();
  return {
    pool: pool as unknown as Pool,
    client: client as unknown as PoolClient,
    poolMock: pool,
    clientMock: client,
    natsMock: nat,
    deps: {
      pool: pool as unknown as Pool,
      nats: nat.connection,
    },
  };
}

const BASE_CREATE_REQ: CreateNotificationRequest = {
  userId: 'usr-adopter',
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_UNSPECIFIED,
  title: 'Application submitted',
  message: 'Your application was received.',
  dataJson: '{"applicationId":"app-1"}',
  templateVariablesJson: '{}',
};

// --- Create ----------------------------------------------------------

describe('createNotification', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects when user_id is missing — INVALID_ARGUMENT', async () => {
    await expect(
      createNotification(mocks.deps, SYSTEM_PRINCIPAL, { ...BASE_CREATE_REQ, userId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when title is missing — INVALID_ARGUMENT', async () => {
    await expect(
      createNotification(mocks.deps, SYSTEM_PRINCIPAL, { ...BASE_CREATE_REQ, title: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when type is UNSPECIFIED — INVALID_ARGUMENT', async () => {
    await expect(
      createNotification(mocks.deps, SYSTEM_PRINCIPAL, {
        ...BASE_CREATE_REQ,
        type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_UNSPECIFIED,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when the principal lacks notifications.create — PERMISSION_DENIED', async () => {
    await expect(
      createNotification(mocks.deps, ADOPTER_PRINCIPAL, BASE_CREATE_REQ)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('inserts the row inside a transaction and publishes notifications.created AFTER commit', async () => {
    const insertedRow = rowFixture();
    // Track call order so we can assert publish-after-commit.
    const calls: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      calls.push(sql.trim().split(/\s+/)[0]);
      if (sql.trim().startsWith('INSERT')) {
        return { rows: [insertedRow] };
      }
      return { rows: [] };
    });
    mocks.natsMock.publishSpy.mockImplementation((subject: string) => {
      calls.push('NATS_PUBLISH');
      void subject;
    });

    const res = await createNotification(mocks.deps, SYSTEM_PRINCIPAL, BASE_CREATE_REQ);

    expect(calls).toEqual(['BEGIN', 'INSERT', 'COMMIT', 'NATS_PUBLISH']);
    expect(res.notification.notificationId).toBe('n-1');
    expect(res.notification.userId).toBe('usr-adopter');
    expect(res.notification.title).toBe('Application submitted');
    expect(res.notification.type).toBe(
      NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS
    );
    expect(res.notification.priority).toBe(
      NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL
    );
  });

  it('publishes the event with an idempotency-friendly id (notifications.created.<id>)', async () => {
    mocks.clientMock.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
    mocks.clientMock.query.mockResolvedValueOnce({ rows: [rowFixture()] }); // INSERT
    mocks.clientMock.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

    await createNotification(mocks.deps, SYSTEM_PRINCIPAL, BASE_CREATE_REQ);

    const [subject, body] = mocks.natsMock.publishSpy.mock.calls[0] as [string, Uint8Array];
    expect(subject).toBe('notifications.created');
    const envelope = JSON.parse(
      body instanceof Uint8Array ? new TextDecoder().decode(body) : (body as string)
    );
    expect(envelope.id).toMatch(/^notifications\.created\.[0-9a-f-]{36}$/);
    expect(envelope.payload.userId).toBe('usr-adopter');
    expect(envelope.payload.type).toBe('application_status');
  });

  it('does NOT publish when the INSERT throws (publish-after-commit honoured)', async () => {
    const sqlError = new Error('duplicate key');
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      if (sql.trim().startsWith('INSERT')) {
        throw sqlError;
      }
      return { rows: [] };
    });

    await expect(createNotification(mocks.deps, SYSTEM_PRINCIPAL, BASE_CREATE_REQ)).rejects.toThrow(
      'duplicate key'
    );

    expect(mocks.natsMock.publishSpy).not.toHaveBeenCalled();
  });
});

// --- List ------------------------------------------------------------

describe('listNotifications', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('queries scoped to the principal user_id with the default limit of 20', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [rowFixture(), rowFixture({ notification_id: 'n-2' })],
    });

    const req: ListNotificationsRequest = {
      cursor: undefined,
      limit: 0,
      statusFilter: 0,
      channelFilter: 0,
      typeFilter: 0,
    };
    const res = await listNotifications(mocks.deps, ADOPTER_PRINCIPAL, req);

    const [, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(params[0]).toBe(ADOPTER_PRINCIPAL.userId);
    // limit+1 = 21 by default
    expect(params[params.length - 1]).toBe(21);
    expect(res.notifications).toHaveLength(2);
    expect(res.nextCursor).toBeUndefined();
  });

  it('returns a next_cursor when the result set hits limit+1', async () => {
    const rows = Array.from({ length: 21 }, (_, i) =>
      rowFixture({
        notification_id: `n-${i + 1}`,
        created_at: new Date(`2026-06-${String(i + 1).padStart(2, '0')}T10:00:00Z`),
      })
    ).reverse();
    mocks.poolMock.query.mockResolvedValueOnce({ rows });

    const res = await listNotifications(mocks.deps, ADOPTER_PRINCIPAL, {
      cursor: undefined,
      limit: 0,
      statusFilter: 0,
      channelFilter: 0,
      typeFilter: 0,
    });

    expect(res.notifications).toHaveLength(20);
    expect(res.nextCursor).toBeDefined();
    const decoded = JSON.parse(Buffer.from(res.nextCursor!, 'base64').toString('utf8'));
    expect(decoded.notificationId).toBe(rows[19]!.notification_id);
  });

  it('rejects a limit > 100 — INVALID_ARGUMENT', async () => {
    await expect(
      listNotifications(mocks.deps, ADOPTER_PRINCIPAL, {
        cursor: undefined,
        limit: 500,
        statusFilter: 0,
        channelFilter: 0,
        typeFilter: 0,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects a malformed cursor — INVALID_ARGUMENT', async () => {
    await expect(
      listNotifications(mocks.deps, ADOPTER_PRINCIPAL, {
        cursor: 'not-base64-or-json',
        limit: 0,
        statusFilter: 0,
        channelFilter: 0,
        typeFilter: 0,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('includes the status filter in the WHERE clause when supplied', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    await listNotifications(mocks.deps, ADOPTER_PRINCIPAL, {
      cursor: undefined,
      limit: 0,
      statusFilter: NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_PENDING,
      channelFilter: 0,
      typeFilter: 0,
    });

    const [sql, params] = mocks.poolMock.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/status = \$2/);
    expect(params[1]).toBe('pending');
  });

  it('allows super_admin to call List even without notifications.read in their permission array', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      listNotifications(mocks.deps, SUPER_ADMIN_PRINCIPAL, {
        cursor: undefined,
        limit: 0,
        statusFilter: 0,
        channelFilter: 0,
        typeFilter: 0,
      })
    ).resolves.toBeDefined();
  });
});

// --- Dismiss ---------------------------------------------------------

describe('dismissNotification', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const dismissReq: DismissNotificationRequest = { notificationId: 'n-1' };

  it('rejects when notification_id is missing — INVALID_ARGUMENT', async () => {
    await expect(
      dismissNotification(mocks.deps, ADOPTER_PRINCIPAL, { notificationId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('returns NOT_FOUND when the notification does not exist', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      dismissNotification(mocks.deps, ADOPTER_PRINCIPAL, dismissReq)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects when the principal does not own the notification — PERMISSION_DENIED', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [rowFixture({ user_id: 'someone-else' })],
    });

    await expect(
      dismissNotification(mocks.deps, ADOPTER_PRINCIPAL, dismissReq)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('is idempotent when the notification is already read — returns the row without writing or publishing', async () => {
    mocks.poolMock.query.mockResolvedValueOnce({
      rows: [rowFixture({ status: 'read', read_at: new Date('2026-06-01T11:00:00Z') })],
    });

    const res = await dismissNotification(mocks.deps, ADOPTER_PRINCIPAL, dismissReq);

    // Only the SELECT happened — no transaction, no publish.
    expect(mocks.poolMock.connect).not.toHaveBeenCalled();
    expect(mocks.natsMock.publishSpy).not.toHaveBeenCalled();
    expect(res.notification.status).toBe(
      NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_READ
    );
  });

  it('updates the row and publishes notifications.dismissed after commit on a happy-path dismiss', async () => {
    const initial = rowFixture({ status: 'delivered' });
    const updated = rowFixture({
      status: 'read',
      read_at: new Date('2026-06-01T11:00:00Z'),
      updated_at: new Date('2026-06-01T11:00:00Z'),
    });
    mocks.poolMock.query.mockResolvedValueOnce({ rows: [initial] });

    const calls: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      calls.push(sql.trim().split(/\s+/)[0]);
      if (sql.trim().startsWith('UPDATE')) {
        return { rows: [updated] };
      }
      return { rows: [] };
    });
    mocks.natsMock.publishSpy.mockImplementation((subject: string) => {
      calls.push('NATS_PUBLISH');
      void subject;
    });

    const res = await dismissNotification(mocks.deps, ADOPTER_PRINCIPAL, dismissReq);

    expect(calls).toEqual(['BEGIN', 'UPDATE', 'COMMIT', 'NATS_PUBLISH']);
    expect(res.notification.status).toBe(
      NotificationsV1.NotificationStatus.NOTIFICATION_STATUS_READ
    );
    const [subject, body] = mocks.natsMock.publishSpy.mock.calls[0] as [string, Uint8Array];
    expect(subject).toBe('notifications.dismissed');
    const envelope = JSON.parse(
      body instanceof Uint8Array ? new TextDecoder().decode(body) : (body as string)
    );
    expect(envelope.id).toBe('notifications.dismissed.n-1');
    expect(envelope.payload.userId).toBe('usr-adopter');
  });
});

// --- HandlerError ----------------------------------------------------

describe('createNotification idempotency (dedup)', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // SQL-aware mock: the dedup claim hits processed_events; the row insert
  // hits notifications.notifications. Order is recorded so we can assert the
  // claim happens before the insert, inside the one transaction.
  const wireClient = (claimRowCount: number, calls: string[]): void => {
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      if (sql.includes('processed_events')) {
        calls.push('CLAIM');
        return { rowCount: claimRowCount, rows: [] };
      }
      if (sql.trim().startsWith('INSERT')) {
        calls.push('INSERT');
        return { rows: [rowFixture()] };
      }
      calls.push(sql.trim().split(/\s+/)[0]);
      return { rows: [] };
    });
    mocks.natsMock.publishSpy.mockImplementation((subject: string) => {
      calls.push('PUBLISH');
      void subject;
    });
  };

  it('claims the event before inserting, then inserts + publishes on first delivery', async () => {
    const calls: string[] = [];
    wireClient(1, calls);

    const res = await createNotification(mocks.deps, SYSTEM_PRINCIPAL, BASE_CREATE_REQ, {
      dedup: { consumer: 'applications.approved', eventId: 'app-1' },
    });

    expect(calls).toEqual(['BEGIN', 'CLAIM', 'INSERT', 'COMMIT', 'PUBLISH']);
    expect(res.notification?.notificationId).toBe('n-1');
  });

  it('skips the insert + publish on a redelivery (claim loses the ON CONFLICT race)', async () => {
    const calls: string[] = [];
    wireClient(0, calls);

    const res = await createNotification(mocks.deps, SYSTEM_PRINCIPAL, BASE_CREATE_REQ, {
      dedup: { consumer: 'applications.approved', eventId: 'app-1' },
    });

    expect(calls).toEqual(['BEGIN', 'CLAIM', 'COMMIT']);
    expect(res.notification).toBeUndefined();
    expect(mocks.natsMock.publishSpy).not.toHaveBeenCalled();
  });

  it('does not claim anything when no dedup option is supplied (direct gRPC path)', async () => {
    const calls: string[] = [];
    wireClient(1, calls);

    await createNotification(mocks.deps, SYSTEM_PRINCIPAL, BASE_CREATE_REQ);

    expect(calls).toEqual(['BEGIN', 'INSERT', 'COMMIT', 'PUBLISH']);
  });
});

describe('HandlerError', () => {
  it('carries the code field for downstream gRPC status mapping', () => {
    const err = new HandlerError('NOT_FOUND', 'gone');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('gone');
    expect(err.name).toBe('HandlerError');
  });
});
