import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/node', async () => {
  return {
    init: vi.fn(),
  };
});
vi.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: vi.fn(() => ({ name: 'profiling' })),
}));

import * as Sentry from '@sentry/node';

import { initializeSentry, redactSentryEvent } from './sentry.js';

const ENV_KEYS = ['SENTRY_DSN', 'NODE_ENV', 'SENTRY_RELEASE', 'HOSTNAME'] as const;

function snapshotEnv() {
  return Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]])) as Record<
    (typeof ENV_KEYS)[number],
    string | undefined
  >;
}
function restoreEnv(snap: ReturnType<typeof snapshotEnv>) {
  for (const k of ENV_KEYS) {
    if (snap[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = snap[k];
    }
  }
}

describe('redactSentryEvent', () => {
  it('redacts authorization + cookie headers regardless of casing', () => {
    const event = {
      request: {
        headers: {
          Authorization: 'Bearer abc',
          cookie: 'session=secret',
          'X-Trace': 'keep-me',
        },
      },
    } as unknown as Sentry.ErrorEvent;

    const out = redactSentryEvent(event);

    expect(out.request!.headers).toEqual({
      Authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      'X-Trace': 'keep-me',
    });
  });

  it('replaces the cookies dict wholesale', () => {
    const event = {
      request: { cookies: { access_token: 'abc', refresh_token: 'def' } },
    } as unknown as Sentry.ErrorEvent;

    const out = redactSentryEvent(event);

    expect(out.request!.cookies).toEqual({ '[REDACTED]': '[REDACTED]' });
  });

  it('redacts secret-shaped keys recursively in request.data', () => {
    const event = {
      request: {
        data: {
          email: 'a@b.com',
          password: 'pw',
          nested: { apiKey: 'k', items: [{ api_key: 'k2' }] },
        },
      },
    } as unknown as Sentry.ErrorEvent;

    const out = redactSentryEvent(event);

    expect(out.request!.data).toEqual({
      email: 'a@b.com',
      password: '[REDACTED]',
      nested: { apiKey: '[REDACTED]', items: [{ api_key: '[REDACTED]' }] },
    });
  });

  it('collapses UUIDs and numeric ids in URLs to `:id`', () => {
    const event = {
      request: { url: '/api/v1/users/a1b2c3d4-1234-5678-9abc-def012345678/orders/42' },
      transaction: '/api/v1/users/a1b2c3d4-1234-5678-9abc-def012345678',
    } as unknown as Sentry.ErrorEvent;

    const out = redactSentryEvent(event);

    expect(out.request!.url).toBe('/api/v1/users/:id/orders/:id');
    expect(out.transaction).toBe('/api/v1/users/:id');
  });

  it('applies the same secret-key redaction to breadcrumb data', () => {
    const event = {
      breadcrumbs: [
        {
          category: 'http',
          message: 'POST /login',
          data: { password: 'pw', email: 'x@y.com' },
        },
      ],
    } as unknown as Sentry.ErrorEvent;

    const out = redactSentryEvent(event);

    expect(out.breadcrumbs![0].data).toEqual({ password: '[REDACTED]', email: 'x@y.com' });
  });

  it('returns the event unchanged when no request / breadcrumbs are present', () => {
    const event = { level: 'error' } as unknown as Sentry.ErrorEvent;
    expect(redactSentryEvent(event)).toBe(event);
  });
});

describe('initializeSentry', () => {
  let envSnap: ReturnType<typeof snapshotEnv>;

  beforeEach(() => {
    envSnap = snapshotEnv();
    for (const k of ENV_KEYS) delete process.env[k];
    vi.mocked(Sentry.init).mockReset();
  });

  afterEach(() => {
    restoreEnv(envSnap);
  });

  it('is a no-op when SENTRY_DSN is unset', () => {
    process.env.NODE_ENV = 'production';
    const log = { info: vi.fn(), error: vi.fn() };
    initializeSentry({ serviceName: 'svc', logger: log });
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Sentry is disabled'));
  });

  it('is a no-op when NODE_ENV is not production/staging, even with a DSN', () => {
    process.env.SENTRY_DSN = 'https://example.ingest.sentry.io/123';
    process.env.NODE_ENV = 'development';
    const log = { info: vi.fn(), error: vi.fn() };
    initializeSentry({ serviceName: 'svc', logger: log });
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('calls Sentry.init when DSN is set and NODE_ENV is production', () => {
    process.env.SENTRY_DSN = 'https://example.ingest.sentry.io/123';
    process.env.NODE_ENV = 'production';
    const log = { info: vi.fn(), error: vi.fn() };

    initializeSentry({ serviceName: 'svc.gateway', logger: log });

    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(Sentry.init).mock.calls[0][0]!;
    expect(callArg.dsn).toBe('https://example.ingest.sentry.io/123');
    expect(callArg.environment).toBe('production');
    expect(callArg.tracesSampleRate).toBe(0.1);
    expect(callArg.profilesSampleRate).toBe(0.1);
    expect(callArg.serverName).toBe('svc.gateway');
  });

  it('uses HOSTNAME as serverName when it is set, overriding the serviceName fallback', () => {
    process.env.SENTRY_DSN = 'https://example.ingest.sentry.io/123';
    process.env.NODE_ENV = 'production';
    process.env.HOSTNAME = 'pod-abc-123';
    const log = { info: vi.fn(), error: vi.fn() };

    initializeSentry({ serviceName: 'svc', logger: log });

    const callArg = vi.mocked(Sentry.init).mock.calls[0][0]!;
    expect(callArg.serverName).toBe('pod-abc-123');
  });

  it('uses staging sample rates when NODE_ENV is staging', () => {
    process.env.SENTRY_DSN = 'https://example.ingest.sentry.io/123';
    process.env.NODE_ENV = 'staging';
    const log = { info: vi.fn(), error: vi.fn() };

    initializeSentry({ serviceName: 'svc', logger: log });

    const callArg = vi.mocked(Sentry.init).mock.calls[0][0]!;
    expect(callArg.tracesSampleRate).toBe(1.0);
    expect(callArg.profilesSampleRate).toBe(1.0);
  });
});
