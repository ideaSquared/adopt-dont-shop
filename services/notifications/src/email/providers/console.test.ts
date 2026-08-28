import { describe, expect, it, vi } from 'vitest';

import type { QueuedEmail } from '../types.js';

import { createConsoleProvider, type ConsoleProviderDeps } from './console.js';

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

describe('console provider — log hygiene (ADS-1257)', () => {
  it('never logs rendered HTML (which carries one-time tokens) and masks recipients', async () => {
    const info = vi.fn();
    const logger = {
      info,
      warn: () => undefined,
      error: () => undefined,
      debug: () => undefined,
    } as unknown as ConsoleProviderDeps['logger'];
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

    const [event, meta] = info.mock.calls[0] as [string, Record<string, unknown>];
    expect(event).toBe('email.console.send');
    // No rendered HTML preview at all — the token can never reach the logs.
    expect(meta.htmlPreview).toBeUndefined();
    // Recipients masked.
    expect(meta.to).toBe('a***@example.com');
    expect(meta.cc).toEqual(['b***@example.com']);
    const serialized = JSON.stringify(meta);
    expect(serialized).not.toContain('SECRET-TOKEN-123');
    expect(serialized).not.toContain('adopter@example.com');
    expect(serialized).not.toContain('boss@example.com');
  });
});
