// Behaviour tests for the verification and password-reset emails that
// service.notifications sends in response to auth.userRegistered and
// auth.passwordResetRequested.

import type { NatsConnection } from 'nats';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

const subscribeMock = vi.fn();
vi.mock('@adopt-dont-shop/events', async () => {
  const actual =
    await vi.importActual<typeof import('@adopt-dont-shop/events')>('@adopt-dont-shop/events');
  return { ...actual, subscribe: (...args: unknown[]) => subscribeMock(...args) };
});

const insertEmailMock = vi.fn();
vi.mock('../email/queue.js', () => ({
  insertEmail: (...args: unknown[]) => insertEmailMock(...args),
}));

import { registerAuthEmailSubscribers } from './auth-emails.js';

const TOKEN = 'tok_AbC-123_secretValue';

const CONFIG = {
  frontendUrl: 'http://localhost:3000/',
  rescueAppUrl: 'http://localhost:3002/',
  adminAppUrl: 'http://localhost:3001/',
  fromEmail: 'noreply@adoptdontshop.com',
  fromName: "Adopt Don't Shop",
};

const makeLogger = () => {
  const calls: unknown[][] = [];
  const record = (...args: unknown[]) => {
    calls.push(args);
  };
  const logger = {
    info: record,
    warn: record,
    error: record,
    debug: record,
  } as unknown as Logger;
  return { logger, calls };
};

type Handler = (payload: unknown, meta: { id?: string }) => Promise<void>;

const register = (now: () => Date = () => new Date('2026-11-07T12:00:00.000Z')) => {
  const handlers = new Map<string, Handler>();
  subscribeMock.mockImplementation((_nats, opts: { subject: string }, handler: Handler) => {
    handlers.set(opts.subject, handler);
    return { drain: async () => undefined };
  });
  const { logger, calls } = makeLogger();
  const subs = registerAuthEmailSubscribers({
    nats: {} as NatsConnection,
    pool: {} as Pool,
    logger,
    config: CONFIG,
    onError: () => undefined,
    now,
  });
  return { handlers, subs, logCalls: calls };
};

const REGISTERED = {
  userId: 'usr-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  verificationToken: TOKEN,
  verificationExpiresAt: '2026-11-08T14:30:00.000Z',
};

const RESET = {
  userId: 'usr-1',
  email: 'ada@example.com',
  firstName: 'Ada',
  resetToken: TOKEN,
  resetExpiresAt: '2026-11-07T15:30:00.000Z',
};

const STAFF_INVITED = {
  invitationId: 'inv-1',
  rescueId: 'rsc-1',
  email: 'newstaff@example.com',
  invitedBy: 'usr-9',
  expiration: '2026-11-14T12:00:00.000Z',
  token: TOKEN,
};

const EMAIL_CHANGE_REQUESTED = {
  userId: 'usr-1',
  firstName: 'Ada',
  oldEmail: 'ada@example.com',
  newEmail: 'newada@example.org',
  token: TOKEN,
  expiresAt: '2026-11-08T12:00:00.000Z',
};

const EMAIL_CHANGE_CONFLICT = {
  userId: 'usr-1',
  newEmail: 'taken@example.org',
};

describe('registerAuthEmailSubscribers', () => {
  beforeEach(() => {
    subscribeMock.mockReset();
    insertEmailMock.mockReset();
    insertEmailMock.mockResolvedValue({});
  });

  it('subscribes to each auth email event with its own durable', () => {
    const { subs } = register();

    expect(subs).toHaveLength(5);
    const opts = subscribeMock.mock.calls.map(c => c[1] as { subject: string; durable: string });
    expect(opts.map(o => o.subject)).toEqual([
      'auth.userRegistered',
      'auth.passwordResetRequested',
      'rescue.staffInvited',
      'auth.emailChangeRequested',
      'auth.emailChangeConflict',
    ]);
    expect(opts.map(o => o.durable)).toEqual([
      'notifications-workers-auth-userRegistered',
      'notifications-workers-auth-passwordResetRequested',
      'notifications-workers-rescue-staffInvited',
      'notifications-workers-auth-emailChangeRequested',
      'notifications-workers-auth-emailChangeConflict',
    ]);
  });

  it('queues a verification email with a clickable link to the client verify page', async () => {
    const { handlers } = register();

    await handlers.get('auth.userRegistered')!(REGISTERED, { id: 'evt-1' });

    expect(insertEmailMock).toHaveBeenCalledTimes(1);
    const email = insertEmailMock.mock.calls[0][1];
    const link = `http://localhost:3000/verify-email?token=${TOKEN}`;
    expect(email).toMatchObject({
      toEmail: 'ada@example.com',
      toName: 'Ada',
      fromEmail: 'noreply@adoptdontshop.com',
      fromName: "Adopt Don't Shop",
      type: 'transactional',
      userId: 'usr-1',
    });
    expect(email.subject).toMatch(/verify your email/i);
    expect(email.htmlContent).toContain(`href="${link}"`);
    expect(email.textContent).toContain(link);
    expect(email.textContent).toMatch(/Hello Ada/);
  });

  it('queues a password reset email with a link to the client reset page', async () => {
    const { handlers } = register();

    await handlers.get('auth.passwordResetRequested')!(RESET, { id: 'evt-2' });

    const email = insertEmailMock.mock.calls[0][1];
    const link = `http://localhost:3000/reset-password?token=${TOKEN}`;
    expect(email.subject).toMatch(/reset your password/i);
    expect(email.htmlContent).toContain(`href="${link}"`);
    expect(email.textContent).toContain(link);
    expect(email.textContent).toMatch(/if you did not ask/i);
  });

  it('links a rescue staff member to the reset page on the rescue app', async () => {
    const { handlers } = register();

    await handlers.get('auth.passwordResetRequested')!(
      { ...RESET, userType: 'rescue_staff' },
      { id: 'evt-reset-rescue' }
    );

    const email = insertEmailMock.mock.calls[0][1];
    const link = `http://localhost:3002/reset-password?token=${TOKEN}`;
    expect(email.htmlContent).toContain(`href="${link}"`);
    expect(email.textContent).toContain(link);
  });

  it.each(['admin', 'super_admin', 'moderator', 'support_agent'])(
    'links a reset requested by %s to the admin app',
    async userType => {
      const { handlers } = register();

      await handlers.get('auth.passwordResetRequested')!(
        { ...RESET, userType },
        { id: `evt-reset-${userType}` }
      );

      const email = insertEmailMock.mock.calls[0][1];
      const link = `http://localhost:3001/reset-password?token=${TOKEN}`;
      expect(email.htmlContent).toContain(`href="${link}"`);
      expect(email.textContent).toContain(link);
    }
  );

  it('links an adopter, or an event published before userType rode along, to the client app', async () => {
    const { handlers } = register();

    await handlers.get('auth.passwordResetRequested')!(
      { ...RESET, userType: 'adopter' },
      { id: 'evt-reset-adopter' }
    );
    await handlers.get('auth.passwordResetRequested')!(RESET, { id: 'evt-reset-legacy' });

    const link = `http://localhost:3000/reset-password?token=${TOKEN}`;
    expect(insertEmailMock).toHaveBeenCalledTimes(2);
    insertEmailMock.mock.calls.forEach(([, email]) => {
      expect(email.htmlContent).toContain(`href="${link}"`);
      expect(email.textContent).toContain(link);
    });
  });

  it('queues a staff invitation email linking to the rescue app accept page, without logging the address or token', async () => {
    const { handlers, logCalls } = register();

    await handlers.get('rescue.staffInvited')!(STAFF_INVITED, { id: 'evt-inv-1' });

    expect(insertEmailMock).toHaveBeenCalledTimes(1);
    const email = insertEmailMock.mock.calls[0][1];
    const link = `http://localhost:3002/accept-invitation?token=${TOKEN}`;
    expect(email).toMatchObject({
      toEmail: 'newstaff@example.com',
      type: 'transactional',
      metadata: { essential: true },
    });
    expect(email.subject).toMatch(/invited/i);
    expect(email.htmlContent).toContain(`href="${link}"`);
    expect(email.textContent).toContain(link);
    expect(email.textContent).toMatch(/14 November 2026/);
    expect(JSON.stringify(logCalls)).not.toContain(TOKEN);
    expect(JSON.stringify(logCalls)).not.toContain('newstaff@example.com');
  });

  it('acknowledges a staff invitation without emailing when it has no token or has expired', async () => {
    const { handlers } = register(() => new Date('2026-11-20T00:00:00.000Z'));

    await handlers.get('rescue.staffInvited')!(STAFF_INVITED, { id: 'evt-inv-2' }); // expired 14 Nov
    await handlers.get('rescue.staffInvited')!(
      { ...STAFF_INVITED, token: undefined, expiration: '2026-12-01T00:00:00.000Z' },
      { id: 'evt-inv-3' }
    );

    expect(insertEmailMock).not.toHaveBeenCalled();
  });

  it('escapes the name in HTML and URL-encodes the token', async () => {
    const { handlers } = register();

    await handlers.get('auth.userRegistered')!(
      { ...REGISTERED, firstName: '<script>x</script>', verificationToken: 'a b&c' },
      { id: 'evt-3' }
    );

    const email = insertEmailMock.mock.calls[0][1];
    expect(email.htmlContent).not.toContain('<script>');
    expect(email.htmlContent).toContain('verify-email?token=a%20b%26c');
  });

  it('uses a different idempotency key for the resend variant, whose event id differs', async () => {
    const { handlers } = register();

    await handlers.get('auth.userRegistered')!(REGISTERED, { id: 'auth.userRegistered.usr-1' });
    await handlers.get('auth.userRegistered')!(REGISTERED, {
      id: 'auth.userRegistered.resend.usr-1.abcd1234',
    });

    const keys = insertEmailMock.mock.calls.map(c => c[1].idempotencyKey);
    expect(keys[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(keys[1]).toMatch(/^[0-9a-f]{64}$/);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('keeps the idempotency key within the 64-character column even for real UUID event ids', async () => {
    const { handlers } = register();
    const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    await handlers.get('auth.userRegistered')!(REGISTERED, {
      id: `auth.userRegistered.resend.${uuid}.abcd1234`,
    });
    await handlers.get('auth.passwordResetRequested')!(RESET, {
      id: `auth.passwordResetRequested.${uuid}.abcd1234`,
    });

    const keys = insertEmailMock.mock.calls.map(c => c[1].idempotencyKey as string);
    expect(keys.every(k => k.length <= 64)).toBe(true);
    expect(new Set(keys).size).toBe(2);
  });

  it('marks the email as essential so a user who opted out of email can still reset or verify', async () => {
    const { handlers } = register();

    await handlers.get('auth.userRegistered')!(REGISTERED, { id: 'evt-1' });
    await handlers.get('auth.passwordResetRequested')!(RESET, { id: 'evt-2' });
    await handlers.get('rescue.staffInvited')!(STAFF_INVITED, { id: 'evt-3' });

    for (const [, email] of insertEmailMock.mock.calls) {
      expect(email.metadata).toEqual({ essential: true });
    }
  });

  it('acknowledges without emailing when the link has already expired (a replayed old event)', async () => {
    const { handlers } = register(() => new Date('2026-11-09T00:00:00.000Z'));

    await handlers.get('auth.userRegistered')!(REGISTERED, { id: 'evt-8' }); // expired 8 Nov 14:30
    await handlers.get('auth.passwordResetRequested')!(RESET, { id: 'evt-9' }); // expired 7 Nov 15:30

    expect(insertEmailMock).not.toHaveBeenCalled();
  });

  it('still sends when the link has not expired yet, and when no expiry is given', async () => {
    const { handlers } = register(() => new Date('2026-11-07T15:29:59.000Z'));

    await handlers.get('auth.passwordResetRequested')!(RESET, { id: 'evt-10' });
    await handlers.get('auth.userRegistered')!(
      { ...REGISTERED, verificationExpiresAt: undefined },
      { id: 'evt-11' }
    );

    expect(insertEmailMock).toHaveBeenCalledTimes(2);
  });

  it('treats a redelivered event as a no-op when the idempotency key already exists', async () => {
    const { handlers } = register();
    insertEmailMock.mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), {
        code: '23505',
        constraint: 'email_queue_idempotency_key_unique',
      })
    );

    await expect(
      handlers.get('auth.userRegistered')!(REGISTERED, { id: 'evt-1' })
    ).resolves.toBeUndefined();
  });

  it('rethrows other failures so JetStream redelivers', async () => {
    const { handlers } = register();
    insertEmailMock.mockRejectedValueOnce(new Error('db down'));

    await expect(handlers.get('auth.userRegistered')!(REGISTERED, { id: 'evt-1' })).rejects.toThrow(
      'db down'
    );
  });

  it('skips an event that carries no email address or token, without queuing anything', async () => {
    const { handlers } = register();

    await handlers.get('auth.userRegistered')!({ ...REGISTERED, email: '' }, { id: 'evt-4' });
    await handlers.get('auth.passwordResetRequested')!(
      { ...RESET, resetToken: undefined },
      { id: 'evt-5' }
    );

    expect(insertEmailMock).not.toHaveBeenCalled();
  });

  it('never writes the one-time token or the address to the logs', async () => {
    const { handlers, logCalls } = register();
    insertEmailMock.mockRejectedValueOnce(new Error('db down'));

    await handlers.get('auth.passwordResetRequested')!(RESET, { id: 'evt-6' }).catch(
      () => undefined
    );
    await handlers.get('auth.userRegistered')!(REGISTERED, { id: 'evt-7' });

    const logged = JSON.stringify(logCalls);
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain('ada@example.com');
  });
  describe('email change', () => {
    const emailTo = (address: string) =>
      insertEmailMock.mock.calls.map(c => c[1]).find(e => e.toEmail === address);

    it('mails the confirmation link and its expiry to the new address', async () => {
      const { handlers } = register();

      await handlers.get('auth.emailChangeRequested')!(EMAIL_CHANGE_REQUESTED, { id: 'evt-ec-1' });

      const email = emailTo('newada@example.org');
      const link = `http://localhost:3000/confirm-email-change?token=${TOKEN}`;
      expect(email).toMatchObject({
        toName: 'Ada',
        type: 'transactional',
        userId: 'usr-1',
        metadata: { essential: true },
      });
      expect(email.subject).toMatch(/confirm your new email/i);
      expect(email.htmlContent).toContain(`href="${link}"`);
      expect(email.textContent).toContain(link);
      expect(email.textContent).toMatch(/8 November 2026 at 12:00 UTC/);
    });

    it('sends the old address a security notice with the masked new address and no link or token', async () => {
      const { handlers } = register();

      await handlers.get('auth.emailChangeRequested')!(EMAIL_CHANGE_REQUESTED, { id: 'evt-ec-2' });

      expect(insertEmailMock).toHaveBeenCalledTimes(2);
      const notice = emailTo('ada@example.com');
      expect(notice.subject).toMatch(/email address change/i);
      expect(notice.textContent).toContain('n•••@example.org');
      expect(notice.textContent).toMatch(/contact support/i);
      for (const body of [notice.textContent, notice.htmlContent, notice.subject]) {
        expect(body).not.toContain(TOKEN);
        expect(body).not.toContain('confirm-email-change');
        expect(body).not.toContain('newada@example.org');
      }
      expect(notice.htmlContent).not.toContain('<a ');
    });

    it('keys the two emails of one request separately, and the same way on redelivery', async () => {
      const { handlers } = register();

      await handlers.get('auth.emailChangeRequested')!(EMAIL_CHANGE_REQUESTED, { id: 'evt-ec-3' });
      await handlers.get('auth.emailChangeRequested')!(EMAIL_CHANGE_REQUESTED, { id: 'evt-ec-3' });

      const keys = insertEmailMock.mock.calls.map(c => c[1].idempotencyKey as string);
      expect(keys).toHaveLength(4);
      expect(keys.every(k => /^[0-9a-f]{64}$/.test(k))).toBe(true);
      expect(new Set(keys).size).toBe(2);
    });

    it('sends nothing for an expired request or one missing its token or addresses', async () => {
      const { handlers } = register(() => new Date('2026-11-09T00:00:00.000Z'));

      await handlers.get('auth.emailChangeRequested')!(EMAIL_CHANGE_REQUESTED, { id: 'evt-ec-4' });
      await handlers.get('auth.emailChangeRequested')!(
        { ...EMAIL_CHANGE_REQUESTED, token: undefined, expiresAt: undefined },
        { id: 'evt-ec-5' }
      );
      await handlers.get('auth.emailChangeRequested')!(
        { ...EMAIL_CHANGE_REQUESTED, oldEmail: undefined, newEmail: '', expiresAt: undefined },
        { id: 'evt-ec-6' }
      );

      expect(insertEmailMock).not.toHaveBeenCalled();
    });

    it('tells a taken address that someone tried to move an account to it, with no link or token', async () => {
      const { handlers } = register();

      await handlers.get('auth.emailChangeConflict')!(EMAIL_CHANGE_CONFLICT, { id: 'evt-ec-7' });

      expect(insertEmailMock).toHaveBeenCalledTimes(1);
      const email = emailTo('taken@example.org');
      expect(email.subject).toMatch(/already has an account/i);
      expect(email.textContent).toMatch(/sign in/i);
      expect(email.htmlContent).not.toContain('<a ');
      expect(email.textContent).not.toContain('token=');
      expect(email.metadata).toEqual({ essential: true });
    });

    it('skips a conflict event with no address', async () => {
      const { handlers } = register();

      await handlers.get('auth.emailChangeConflict')!({ userId: 'usr-1' }, { id: 'evt-ec-8' });

      expect(insertEmailMock).not.toHaveBeenCalled();
    });

    it('never writes the token or any address to the logs', async () => {
      const { handlers, logCalls } = register();

      await handlers.get('auth.emailChangeRequested')!(EMAIL_CHANGE_REQUESTED, { id: 'evt-ec-9' });
      await handlers.get('auth.emailChangeConflict')!(EMAIL_CHANGE_CONFLICT, { id: 'evt-ec-10' });

      const logged = JSON.stringify(logCalls);
      expect(logged).not.toContain(TOKEN);
      expect(logged).not.toContain('ada@example.com');
      expect(logged).not.toContain('newada@example.org');
      expect(logged).not.toContain('taken@example.org');
    });
  });
});
