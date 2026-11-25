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

const ENV_KEYS = ['SENTRY_DSN', 'NODE_ENV', 'SENTRY_RELEASE', 'HOSTNAME', 'DEPLOY_ENV'] as const;

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

  it('redacts the other credential-bearing headers the request integration can attach', () => {
    const event = {
      request: {
        headers: {
          'x-principal-token': 'signed-principal',
          'X-CSRF-Token': 'csrf',
          'x-api-key': 'key',
          'Set-Cookie': 'session=secret',
          accept: 'application/json',
        },
      },
    } as unknown as Sentry.ErrorEvent;

    const out = redactSentryEvent(event);

    expect(out.request!.headers).toEqual({
      'x-principal-token': '[REDACTED]',
      'X-CSRF-Token': '[REDACTED]',
      'x-api-key': '[REDACTED]',
      'Set-Cookie': '[REDACTED]',
      accept: 'application/json',
    });
  });

  it('masks PII-shaped keys and redacts otp/cookie-shaped keys in request.data', () => {
    const event = {
      request: {
        data: {
          email: 'alice@example.com',
          phone: '07700900123',
          postcode: 'SW1A 1AA',
          otp: '123456',
          sessionCookie: 'abc',
          petId: 'pet-1',
        },
      },
    } as unknown as Sentry.ErrorEvent;

    const out = redactSentryEvent(event);

    expect(out.request!.data).toEqual({
      email: 'a***@example.com',
      phone: '0***',
      postcode: 'S***',
      otp: '[REDACTED]',
      sessionCookie: '[REDACTED]',
      petId: 'pet-1',
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
      email: 'a***@b.com',
      password: '[REDACTED]',
      nested: { apiKey: '[REDACTED]', items: [{ api_key: '[REDACTED]' }] },
    });
  });

  it('redacts the x-client-location header (the caller coordinates) regardless of casing', () => {
    const event = {
      request: {
        headers: {
          'X-Client-Location': '51.5,-0.12',
          'x-client-location': '51.5,-0.12',
          accept: 'application/json',
        },
      },
    } as unknown as Sentry.ErrorEvent;

    const out = redactSentryEvent(event);

    expect(out.request!.headers).toEqual({
      'X-Client-Location': '[REDACTED]',
      'x-client-location': '[REDACTED]',
      accept: 'application/json',
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

  it('strips the caller coordinates (lat/lng/latitude/longitude) from request URLs and query strings', () => {
    const event = {
      request: {
        url: 'https://api.example.com/api/v1/pets?type=dog&lat=51.5&lng=-0.12&page=2',
        query_string: 'latitude=51.5&limit=5&longitude=-0.12',
      },
    } as unknown as Sentry.ErrorEvent;

    const out = redactSentryEvent(event);

    expect(out.request!.url).toBe('https://api.example.com/api/v1/pets?type=dog&page=2');
    expect(out.request!.query_string).toBe('limit=5');
  });

  it('strips coordinates from an object-shaped query string and drops an emptied query', () => {
    const event = {
      request: {
        url: '/api/v1/pets/abc?lat=1&lng=2',
        query_string: { lat: '1', lng: '2', limit: '5' },
      },
    } as unknown as Sentry.ErrorEvent;

    const out = redactSentryEvent(event);

    expect(out.request!.url).toBe('/api/v1/pets/abc');
    expect(out.request!.query_string).toEqual({ limit: '5' });
  });

  it('leaves look-alike params untouched', () => {
    const event = {
      request: { url: '/api/v1/pets?flat=1&platform=x' },
    } as unknown as Sentry.ErrorEvent;

    expect(redactSentryEvent(event).request!.url).toBe('/api/v1/pets?flat=1&platform=x');
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

    expect(out.breadcrumbs![0].data).toEqual({ password: '[REDACTED]', email: 'x***@y.com' });
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
    expect(callArg.profileSessionSampleRate).toBe(0.1);
    expect(callArg.profileLifecycle).toBe('trace');
    expect(callArg.serverName).toBe('svc.gateway');
  });

  it('opts out of the personal data Sentry 11 collects by default', () => {
    process.env.SENTRY_DSN = 'https://example.ingest.sentry.io/123';
    process.env.NODE_ENV = 'production';

    initializeSentry({ serviceName: 'svc.gateway', logger: { info: vi.fn(), error: vi.fn() } });

    expect(vi.mocked(Sentry.init).mock.calls[0][0]!.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      // The gateway takes the caller's coordinates in a header and in lat/lng query params.
      httpHeaders: false,
      urlQueryParams: false,
      httpBodies: [],
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    });
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

  it('reports DEPLOY_ENV as the environment while keeping production sampling', () => {
    process.env.SENTRY_DSN = 'https://example.ingest.sentry.io/123';
    process.env.NODE_ENV = 'production';
    process.env.DEPLOY_ENV = 'staging';
    const log = { info: vi.fn(), error: vi.fn() };

    initializeSentry({ serviceName: 'svc', logger: log });

    const callArg = vi.mocked(Sentry.init).mock.calls[0][0]!;
    expect(callArg.environment).toBe('staging');
    expect(callArg.tracesSampleRate).toBe(0.1);
  });

  it('uses staging sample rates when NODE_ENV is staging', () => {
    process.env.SENTRY_DSN = 'https://example.ingest.sentry.io/123';
    process.env.NODE_ENV = 'staging';
    const log = { info: vi.fn(), error: vi.fn() };

    initializeSentry({ serviceName: 'svc', logger: log });

    const callArg = vi.mocked(Sentry.init).mock.calls[0][0]!;
    expect(callArg.tracesSampleRate).toBe(1.0);
    expect(callArg.profileSessionSampleRate).toBe(1.0);
  });
});
