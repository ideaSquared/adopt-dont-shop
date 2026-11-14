import { createLogger, memorySink } from '@adopt-dont-shop/observability';
import type { Resend } from 'resend';
import { describe, expect, it, vi } from 'vitest';

import { LOG_FIELDS } from '../../logger.js';
import type { QueuedEmail } from '../types.js';

import { createResendProvider, type ResendProviderConfig } from './resend.js';

const makeMemoryLogger = () => {
  const sink = memorySink();
  return {
    logger: createLogger({ serviceName: 'test', fields: LOG_FIELDS, sink }),
    events: sink.events,
  };
};

const quietLogger = makeMemoryLogger().logger;

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
  it('never logs the recipient and logs email.type instead of the raw subject', async () => {
    const { logger, events } = makeMemoryLogger();
    const { client } = makeClient();
    const provider = createResendProvider({ config, logger, client });

    await provider.send(
      queuedEmail({ toEmail: 'adopter@example.com', subject: 'Reset your password' })
    );

    expect(events[0]?.message).toBe('email.resend.send_ok');
    const meta = events[0]?.meta ?? {};
    expect(meta.messageId).toBe('provider-msg-1');
    expect(meta.to).toBeUndefined();
    expect(meta.type).toBe('transactional');
    expect(meta.subject).toBeUndefined();
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('adopter@example.com');
    expect(serialized).not.toContain('Reset your password');
  });

  it('never logs the recipient on the failure path either', async () => {
    const { logger, events } = makeMemoryLogger();
    const send = vi.fn().mockResolvedValue({ data: null, error: { message: 'rejected' } });
    const client = { emails: { send } } as unknown as Pick<Resend, 'emails'>;
    const provider = createResendProvider({ config, logger, client });

    await provider.send(queuedEmail({ toEmail: 'adopter@example.com' }));

    expect(events[0]?.message).toBe('email.resend.send_failed');
    expect(events[0]?.meta?.to).toBeUndefined();
    expect(JSON.stringify(events)).not.toContain('adopter@example.com');
  });
});
