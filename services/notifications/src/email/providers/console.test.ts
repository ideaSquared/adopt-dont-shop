import { describe, expect, it } from 'vitest';

import type { QueuedEmail } from '../types.js';

import { createConsoleProvider, type ConsoleProviderDeps } from './console.js';
import { createLogger, memorySink } from '@adopt-dont-shop/observability';
import { LOG_FIELDS } from '../../logger.js';

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

const makeMemoryLogger = () => {
  const sink = memorySink();
  return {
    logger: createLogger({ serviceName: 'test', fields: LOG_FIELDS, sink }),
    events: sink.events,
  };
};

describe('console provider — log hygiene (ADS-1257)', () => {
  it('never logs rendered HTML (which carries one-time tokens) or recipients', async () => {
    const { logger, events } = makeMemoryLogger();
    const provider = createConsoleProvider({ logger });

    await provider.send(
      queuedEmail({
        toEmail: 'adopter@example.com',
        ccEmails: ['boss@example.com'],
        subject: 'Reset your password',
        // A real reset email's HTML carries the raw one-time token in the link.
        htmlContent: '<a href="https://app.example.com/reset?token=SECRET-TOKEN-123">Reset</a>',
      })
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.message).toBe('email.console.send');
    const meta = events[0]?.meta ?? {};
    // No rendered HTML preview at all — the token can never reach the logs.
    expect(meta.htmlPreview).toBeUndefined();
    // No recipient of any kind is logged, masked or not.
    expect(meta.to).toBeUndefined();
    expect(meta.cc).toBeUndefined();
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('SECRET-TOKEN-123');
    expect(serialized).not.toContain('adopter@example.com');
    expect(serialized).not.toContain('boss@example.com');
  });
});
