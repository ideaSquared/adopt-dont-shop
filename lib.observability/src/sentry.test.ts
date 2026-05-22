import { describe, expect, it, vi } from 'vitest';
import { initSentry, redactSentryUser } from './sentry';

const { sentryInitSpy } = vi.hoisted(() => ({ sentryInitSpy: vi.fn() }));
vi.mock('@sentry/react', () => ({
  init: sentryInitSpy,
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

describe('redactSentryUser', () => {
  it('strips email, username and ip_address from event.user', () => {
    const event = {
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'alice@example.com',
        username: 'alice',
        ip_address: '203.0.113.42',
      },
    };

    const result = redactSentryUser(event);

    expect(result.user).toEqual({ id: '00000000-0000-0000-0000-000000000001' });
  });

  it('is a no-op when event.user is absent', () => {
    const event: { user?: Record<string, unknown> | null; message?: string } = {
      message: 'something broke',
    };
    const result = redactSentryUser(event);
    expect(result).toEqual({ message: 'something broke' });
  });

  it('leaves event.user.id intact when no PII fields are present', () => {
    const event = { user: { id: 'uuid-abc' } };
    const result = redactSentryUser(event);
    expect(result.user).toEqual({ id: 'uuid-abc' });
  });
});

describe('initSentry beforeSend wiring', () => {
  it('registers a beforeSend hook that strips identifiable fields from event.user', () => {
    sentryInitSpy.mockClear();

    initSentry({
      dsn: 'https://example@o0.ingest.sentry.io/0',
      appName: 'admin',
      environment: 'production',
    });

    expect(sentryInitSpy).toHaveBeenCalledTimes(1);
    const initOptions = sentryInitSpy.mock.calls[0][0] as {
      beforeSend: (event: { user?: Record<string, unknown> }) => { user?: Record<string, unknown> };
    };
    expect(typeof initOptions.beforeSend).toBe('function');

    const scrubbed = initOptions.beforeSend({
      user: {
        id: 'uuid-1',
        email: 'leak@example.com',
        username: 'leak',
        ip_address: '1.2.3.4',
      },
    });

    expect(scrubbed.user).toEqual({ id: 'uuid-1' });
  });
});
