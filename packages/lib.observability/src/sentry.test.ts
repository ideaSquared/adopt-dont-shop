import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureException, captureMessage, initSentry, redactSentryUser } from './sentry';

const { sentryInitSpy, sentryCaptureExceptionSpy, sentryCaptureMessageSpy } = vi.hoisted(() => ({
  sentryInitSpy: vi.fn(),
  sentryCaptureExceptionSpy: vi.fn(),
  sentryCaptureMessageSpy: vi.fn(),
}));
vi.mock('@sentry/react', () => ({
  init: sentryInitSpy,
  captureException: sentryCaptureExceptionSpy,
  captureMessage: sentryCaptureMessageSpy,
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

  it('forwards the caller-supplied sample rates and app tag to Sentry.init', () => {
    sentryInitSpy.mockClear();

    initSentry({
      dsn: 'https://example@o0.ingest.sentry.io/0',
      appName: 'rescue',
      environment: 'staging',
      release: 'v1.2.3',
      tracesSampleRate: 0.5,
      replaysSessionSampleRate: 0.25,
      replaysOnErrorSampleRate: 1,
    });

    expect(sentryInitSpy).toHaveBeenCalledTimes(1);
    expect(sentryInitSpy.mock.calls[0][0]).toMatchObject({
      dsn: 'https://example@o0.ingest.sentry.io/0',
      environment: 'staging',
      release: 'v1.2.3',
      tracesSampleRate: 0.5,
      replaysSessionSampleRate: 0.25,
      replaysOnErrorSampleRate: 1,
      initialScope: { tags: { app: 'rescue' } },
    });
  });

  it('defaults replay sample rates to zero so session content stays off until opt-in', () => {
    sentryInitSpy.mockClear();

    initSentry({
      dsn: 'https://example@o0.ingest.sentry.io/0',
      appName: 'client',
      environment: 'production',
    });

    expect(sentryInitSpy.mock.calls[0][0]).toMatchObject({
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  });
});

describe('initSentry when no DSN is configured', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips initialisation and warns once outside the test environment', () => {
    sentryInitSpy.mockClear();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    initSentry({ dsn: undefined, appName: 'admin', environment: 'development' });

    expect(sentryInitSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('app.admin');
  });

  it('stays silent in the test environment to avoid noisy output', () => {
    sentryInitSpy.mockClear();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    initSentry({ dsn: '', appName: 'client', environment: 'test' });

    expect(sentryInitSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('captureException', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards the error with extra context when context is supplied', () => {
    sentryCaptureExceptionSpy.mockClear();
    const error = new Error('boom');

    captureException(error, { requestId: 'req-1' });

    expect(sentryCaptureExceptionSpy).toHaveBeenCalledWith(error, {
      extra: { requestId: 'req-1' },
    });
  });

  it('forwards the error without an options object when no context is supplied', () => {
    sentryCaptureExceptionSpy.mockClear();
    const error = new Error('boom');

    captureException(error);

    expect(sentryCaptureExceptionSpy).toHaveBeenCalledWith(error, undefined);
  });
});

describe('captureMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults the severity level to info', () => {
    sentryCaptureMessageSpy.mockClear();

    captureMessage('heads up');

    expect(sentryCaptureMessageSpy).toHaveBeenCalledWith('heads up', 'info');
  });

  it('forwards an explicit severity level', () => {
    sentryCaptureMessageSpy.mockClear();

    captureMessage('something failed', 'error');

    expect(sentryCaptureMessageSpy).toHaveBeenCalledWith('something failed', 'error');
  });
});
