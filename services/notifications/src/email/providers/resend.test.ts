import type { Resend } from 'resend';
import { describe, expect, it, vi } from 'vitest';

import type { QueuedEmail } from '../types.js';

import { createResendProvider, type ResendProviderConfig } from './resend.js';

const quietLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
} as unknown as Parameters<typeof createResendProvider>[0]['logger'];

const config: ResendProviderConfig = {
  apiKey: 'test-key',
  fromEmail: 'noreply@example.com',
  fromName: 'Adopt',
};

const queuedEmail = (overrides: Partial<QueuedEmail> = {}): QueuedEmail =>
  ({
    emailId: 'email-1',
    fromEmail: 'noreply@example.com',
    toEmail: 'adopter@example.com',
    ccEmails: [],
    bccEmails: [],
    subject: 'Hello',
    htmlContent: '<p>Hi</p>',
    templateData: {},
    attachments: [],
    type: 'transactional',
    priority: 'normal',
    status: 'sending',
    maxRetries: 3,
    currentRetries: 0,
    metadata: {},
    tags: [],
    idempotencyKey: null,
    ...overrides,
  }) as QueuedEmail;

function makeClient(): {
  client: Pick<Resend, 'emails'>;
  send: ReturnType<typeof vi.fn>;
} {
  const send = vi.fn().mockResolvedValue({ data: { id: 'provider-msg-1' }, error: null });
  return { client: { emails: { send } } as unknown as Pick<Resend, 'emails'>, send };
}

describe('resend provider — idempotency', () => {
  it('passes a stable Idempotency-Key (the email_id) so a retry cannot double-send', async () => {
    const { client, send } = makeClient();
    const provider = createResendProvider({ config, logger: quietLogger, client });

    await provider.send(queuedEmail({ emailId: 'email-42' }));

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: 'email-42' });
  });

  it('prefers the row idempotency_key when present', async () => {
    const { client, send } = makeClient();
    const provider = createResendProvider({ config, logger: quietLogger, client });

    await provider.send(queuedEmail({ emailId: 'email-42', idempotencyKey: 'idem-99' }));

    expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: 'idem-99' });
  });

  it('returns the provider message id on success', async () => {
    const { client } = makeClient();
    const provider = createResendProvider({ config, logger: quietLogger, client });

    const result = await provider.send(queuedEmail());

    expect(result).toEqual({ success: true, messageId: 'provider-msg-1' });
  });
});

describe('resend provider — log hygiene (ADS-1257)', () => {
  it('masks the recipient and logs email.type instead of the raw subject', async () => {
    const info = vi.fn();
    const logger = {
      info,
      warn: () => undefined,
      error: () => undefined,
      debug: () => undefined,
    } as unknown as Parameters<typeof createResendProvider>[0]['logger'];
    const { client } = makeClient();
    const provider = createResendProvider({ config, logger, client });

    await provider.send(
      queuedEmail({ toEmail: 'adopter@example.com', subject: 'Reset your password' })
    );

    const [event, meta] = info.mock.calls[0] as [string, Record<string, unknown>];
    expect(event).toBe('email.resend.send_ok');
    expect(meta.messageId).toBe('provider-msg-1');
    expect(meta.to).toBe('a***@example.com');
    expect(meta.type).toBe('transactional');
    expect(meta.subject).toBeUndefined();
    const serialized = JSON.stringify(meta);
    expect(serialized).not.toContain('adopter@example.com');
    expect(serialized).not.toContain('Reset your password');
  });

  it('masks the recipient on the failure path too', async () => {
    const error = vi.fn();
    const logger = {
      info: () => undefined,
      warn: () => undefined,
      error,
      debug: () => undefined,
    } as unknown as Parameters<typeof createResendProvider>[0]['logger'];
    const send = vi.fn().mockResolvedValue({ data: null, error: { message: 'rejected' } });
    const client = { emails: { send } } as unknown as Pick<Resend, 'emails'>;
    const provider = createResendProvider({ config, logger, client });

    await provider.send(queuedEmail({ toEmail: 'adopter@example.com' }));

    const [event, meta] = error.mock.calls[0] as [string, Record<string, unknown>];
    expect(event).toBe('email.resend.send_failed');
    expect(meta.to).toBe('a***@example.com');
    expect(JSON.stringify(meta)).not.toContain('adopter@example.com');
  });
});
