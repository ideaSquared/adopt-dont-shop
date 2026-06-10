import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import type { Permission, UserId } from '@adopt-dont-shop/lib.types';
import {
  NotificationsV1,
  type SendEmailRequest,
  type UpdateEmailPreferencesRequest,
} from '@adopt-dont-shop/proto';

import { getEmailPreferences, sendEmail, updateEmailPreferences } from './email-handlers.js';

const SYSTEM_PRINCIPAL: Principal = {
  userId: 'svc-auth' as UserId,
  roles: ['admin'],
  permissions: [
    'notifications.email.send' as Permission,
    'notifications.email-prefs.read' as Permission,
    'notifications.email-prefs.update' as Permission,
  ],
};

const ADOPTER_PRINCIPAL: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: [
    'notifications.email-prefs.read' as Permission,
    'notifications.email-prefs.update' as Permission,
  ],
};

const UNPRIVILEGED_PRINCIPAL: Principal = {
  userId: 'usr-anyone' as UserId,
  roles: ['adopter'],
  permissions: [],
};

const prefsRowFixture = (overrides: Record<string, unknown> = {}) => ({
  preference_id: 'pref-1',
  user_id: 'usr-adopter',
  is_email_enabled: true,
  global_unsubscribe: false,
  preferences: [],
  language: 'en',
  timezone: 'UTC',
  email_format: 'html' as const,
  digest_frequency: 'weekly' as const,
  digest_time: '09:00',
  unsubscribe_token: 'unsub-token-1',
  last_digest_sent: null,
  bounce_count: 0,
  last_bounce_at: null,
  is_blacklisted: false,
  blacklist_reason: null,
  blacklisted_at: null,
  metadata: {},
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

// Make a mock that lets each test script its own pool.query and client.query
// responses. Adopted from handlers.test.ts but with explicit scripts so
// withTransaction's BEGIN/COMMIT noise doesn't consume real return values.
function makeMocks() {
  // The script holds the sequence of query results the next .query()
  // call should return. BEGIN / COMMIT / ROLLBACK pass through.
  const clientScript: Array<{ rows: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK') {
        return { rows: [] };
      }
      const next = clientScript.shift();
      if (!next) {
        throw new Error(`client.query called with no scripted response for: ${sql.slice(0, 80)}`);
      }
      return next;
    }),
    release: vi.fn(),
  };
  const poolScript: Array<{ rows: unknown[] }> = [];
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(async () => {
      const next = poolScript.shift();
      if (!next) return { rows: [] };
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

// Pull only the "real" client query calls (not BEGIN/COMMIT/ROLLBACK)
// so assertions can match on the substantive queries.
const realClientQueries = (mocks: ReturnType<typeof makeMocks>): string[] =>
  (mocks.clientMock.query.mock.calls as Array<[string]>)
    .map(([sql]) => sql.trim().split(/\s+/)[0].toUpperCase())
    .filter(op => op !== 'BEGIN' && op !== 'COMMIT' && op !== 'ROLLBACK');

const BASE_SEND_REQ: SendEmailRequest = {
  toEmail: 'jane@example.com',
  toName: 'Jane',
  fromEmail: '',
  fromName: '',
  replyToEmail: '',
  ccEmails: [],
  bccEmails: [],
  subject: 'Hello',
  htmlContent: '<p>Hi</p>',
  textContent: '',
  templateId: '',
  templateDataJson: '',
  type: NotificationsV1.EmailType.EMAIL_TYPE_TRANSACTIONAL,
  priority: NotificationsV1.EmailPriority.EMAIL_PRIORITY_NORMAL,
  scheduledFor: '',
  metadataJson: '',
  tags: [],
  userId: 'usr-adopter',
  campaignId: '',
  idempotencyKey: '',
} as unknown as SendEmailRequest;

describe('sendEmail', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('rejects when the principal lacks notifications.email.send', async () => {
    await expect(
      sendEmail(mocks.deps, UNPRIVILEGED_PRINCIPAL, BASE_SEND_REQ)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects when to_email is missing', async () => {
    await expect(
      sendEmail(mocks.deps, SYSTEM_PRINCIPAL, { ...BASE_SEND_REQ, toEmail: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when neither template_id nor (subject + html_content) is supplied', async () => {
    await expect(
      sendEmail(mocks.deps, SYSTEM_PRINCIPAL, {
        ...BASE_SEND_REQ,
        subject: '',
        htmlContent: '',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects when template_data_json is not a JSON object', async () => {
    await expect(
      sendEmail(mocks.deps, SYSTEM_PRINCIPAL, {
        ...BASE_SEND_REQ,
        templateDataJson: '"not an object"',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('inlines subject + html → INSERT inside withTransaction and publishes after commit', async () => {
    // Script: 1 INSERT into email_queue returning the row.
    mocks.clientScript.push({ rows: [{ email_id: 'queued-1' }] });
    const res = await sendEmail(mocks.deps, SYSTEM_PRINCIPAL, BASE_SEND_REQ);

    expect(res.alreadyQueued).toBe(false);
    expect(res.emailId).toBeTruthy();
    expect(realClientQueries(mocks)).toEqual(['INSERT']);
    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(1);
    // publishStaged calls nats.publish(subject, JSON-envelope).
    const [subject, body] = mocks.natsMock.publish.mock.calls[0];
    expect(subject).toBe('notifications.email.queued');
    const envelope = JSON.parse(
      body instanceof Uint8Array ? new TextDecoder().decode(body) : (body as string)
    ) as {
      id: string;
      payload: Record<string, unknown>;
    };
    expect(envelope.payload).toMatchObject({
      userId: 'usr-adopter',
      type: 'transactional',
      priority: 'normal',
    });
  });

  it('returns alreadyQueued=true when idempotency_key already present (pre-tx check)', async () => {
    // pool.query (findByIdempotencyKey) returns the existing row.
    mocks.poolScript.push({
      rows: [{ email_id: 'queued-existing' }],
    });

    const res = await sendEmail(mocks.deps, SYSTEM_PRINCIPAL, {
      ...BASE_SEND_REQ,
      idempotencyKey: 'send-once-key',
    });

    expect(res).toEqual({ emailId: 'queued-existing', alreadyQueued: true });
    expect(realClientQueries(mocks)).toEqual([]); // no INSERT
    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
  });

  it('renders a template when template_id is supplied — looks up + increments usage', async () => {
    // pool.query #1 = findActiveTemplate. Worker-side queries follow on the client.
    mocks.poolScript.push({
      rows: [
        {
          template_id: 'tpl-1',
          name: 'welcome',
          subject: 'Welcome {{name}}',
          html_content: '<p>Hi {{name}}</p>',
          text_content: null,
          status: 'active',
        },
      ],
    });
    // client.query #1 = INSERT, #2 = increment usage.
    mocks.clientScript.push({ rows: [{ email_id: 'tpl-queued-1' }] });
    mocks.clientScript.push({ rows: [] });

    const res = await sendEmail(mocks.deps, SYSTEM_PRINCIPAL, {
      ...BASE_SEND_REQ,
      subject: '',
      htmlContent: '',
      templateId: 'tpl-1',
      templateDataJson: '{"name":"Jane"}',
    });

    expect(res.alreadyQueued).toBe(false);
    expect(realClientQueries(mocks)).toEqual(['INSERT', 'UPDATE']);
    // INSERT call params include the rendered subject + html.
    const insertCall = (mocks.clientMock.query.mock.calls as Array<[string, unknown[]]>).find(
      ([sql]) => sql.includes('INSERT INTO email_queue')
    );
    expect(insertCall).toBeDefined();
    const params = insertCall![1];
    // From the insertEmail SQL: subject is param $10, html_content $11.
    expect(params[9]).toBe('Welcome Jane');
    expect(params[10]).toBe('<p>Hi Jane</p>');
  });

  it('returns NOT_FOUND when the referenced template is missing or inactive', async () => {
    mocks.poolScript.push({ rows: [] });
    await expect(
      sendEmail(mocks.deps, SYSTEM_PRINCIPAL, {
        ...BASE_SEND_REQ,
        subject: '',
        htmlContent: '',
        templateId: 'tpl-missing',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('getEmailPreferences', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects an unprivileged principal', async () => {
    await expect(getEmailPreferences(mocks.deps, UNPRIVILEGED_PRINCIPAL, {})).rejects.toMatchObject(
      { code: 'PERMISSION_DENIED' }
    );
  });

  it('returns the calling user’s prefs row (self-read, no user_id supplied)', async () => {
    // findOrCreatePreferences runs SELECT first; pool.query rows[0] = the row.
    mocks.poolScript.push({ rows: [prefsRowFixture()] });

    const res = await getEmailPreferences(mocks.deps, ADOPTER_PRINCIPAL, {});

    expect(res.preferences?.userId).toBe('usr-adopter');
    expect(res.preferences?.isEmailEnabled).toBe(true);
    expect(res.preferences?.emailFormat).toBe(NotificationsV1.EmailFormat.EMAIL_FORMAT_HTML);
    expect(res.preferences?.digestFrequency).toBe(
      NotificationsV1.EmailDigestFrequency.EMAIL_DIGEST_FREQUENCY_WEEKLY
    );
  });

  it('rejects cross-user reads without :any permission', async () => {
    await expect(
      getEmailPreferences(mocks.deps, ADOPTER_PRINCIPAL, { userId: 'usr-someone-else' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('allows cross-user read when principal has :any', async () => {
    const adminAny: Principal = {
      userId: 'svc-admin' as UserId,
      roles: ['admin'],
      permissions: [
        'notifications.email-prefs.read' as Permission,
        'notifications.email-prefs.read:any' as Permission,
      ],
    };
    mocks.poolScript.push({ rows: [prefsRowFixture({ user_id: 'usr-other' })] });

    const res = await getEmailPreferences(mocks.deps, adminAny, { userId: 'usr-other' });
    expect(res.preferences?.userId).toBe('usr-other');
  });
});

describe('updateEmailPreferences', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  it('rejects an unprivileged principal', async () => {
    await expect(
      updateEmailPreferences(
        mocks.deps,
        UNPRIVILEGED_PRINCIPAL,
        {} as UpdateEmailPreferencesRequest
      )
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('rejects non-object preferences_json', async () => {
    await expect(
      updateEmailPreferences(mocks.deps, ADOPTER_PRINCIPAL, {
        preferencesJson: '"not an array"',
      } as UpdateEmailPreferencesRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('applies a self-update: find-or-create then UPDATE returns the row', async () => {
    // findOrCreatePreferences SELECT then UPDATE.
    mocks.poolScript.push({ rows: [prefsRowFixture()] });
    mocks.poolScript.push({
      rows: [prefsRowFixture({ global_unsubscribe: true })],
    });

    const res = await updateEmailPreferences(mocks.deps, ADOPTER_PRINCIPAL, {
      globalUnsubscribe: true,
    } as UpdateEmailPreferencesRequest);

    expect(res.preferences?.globalUnsubscribe).toBe(true);
  });
});
