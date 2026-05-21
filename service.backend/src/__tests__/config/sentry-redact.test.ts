/**
 * Defence-in-depth scrubbing for Sentry events. The Express integration
 * auto-captures `request.cookies`, `request.headers.authorization`, and
 * `request.data` (POST body). Before any of that ships to the SaaS we
 * walk the event and replace credential-shaped fields with [REDACTED].
 */
import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/node';

import { redactSentryEvent } from '../../config/sentry';

const baseEvent = (): ErrorEvent => ({
  type: undefined,
  event_id: 'evt_test',
});

describe('redactSentryEvent', () => {
  it('strips the authorization header regardless of casing', () => {
    const event = baseEvent();
    event.request = {
      headers: {
        Authorization: 'Bearer secret-jwt',
        'content-type': 'application/json',
      },
    };

    const result = redactSentryEvent(event);

    expect(result.request?.headers?.Authorization).toBe('[REDACTED]');
    expect(result.request?.headers?.['content-type']).toBe('application/json');
  });

  it('strips the cookie header', () => {
    const event = baseEvent();
    event.request = {
      headers: {
        cookie: 'refreshToken=abc; sessionId=xyz',
      },
    };

    const result = redactSentryEvent(event);

    expect(result.request?.headers?.cookie).toBe('[REDACTED]');
  });

  it('replaces the entire cookies object with a redaction marker', () => {
    const event = baseEvent();
    event.request = {
      cookies: {
        refreshToken: 'rt-secret',
        accessToken: 'at-secret',
        sessionId: 'sess-1',
      },
    };

    const result = redactSentryEvent(event);

    expect(result.request?.cookies).toEqual({ '[REDACTED]': '[REDACTED]' });
    expect(result.request?.cookies?.refreshToken).toBeUndefined();
    expect(result.request?.cookies?.accessToken).toBeUndefined();
  });

  it('redacts credential-shaped keys in request.data case-insensitively and nested', () => {
    const event = baseEvent();
    event.request = {
      data: {
        email: 'user@example.com',
        password: 'p@ssw0rd',
        Password: 'p@ssw0rd2',
        nested: {
          accessToken: 'at-1',
          api_key: 'ak-1',
          apiKey: 'ak-2',
          client_secret: 'cs-1',
          Authorization: 'Bearer foo',
        },
        list: [{ token: 't-1', name: 'keep-me' }],
      },
    };

    const result = redactSentryEvent(event);
    const data = result.request?.data as Record<string, unknown>;
    const nested = data.nested as Record<string, unknown>;
    const list = data.list as Array<Record<string, unknown>>;

    expect(data.email).toBe('user@example.com');
    expect(data.password).toBe('[REDACTED]');
    expect(data.Password).toBe('[REDACTED]');
    expect(nested.accessToken).toBe('[REDACTED]');
    expect(nested.api_key).toBe('[REDACTED]');
    expect(nested.apiKey).toBe('[REDACTED]');
    expect(nested.client_secret).toBe('[REDACTED]');
    expect(nested.Authorization).toBe('[REDACTED]');
    expect(list[0].token).toBe('[REDACTED]');
    expect(list[0].name).toBe('keep-me');
  });

  it('preserves request.data structure for non-secret fields', () => {
    const event = baseEvent();
    event.request = {
      data: {
        userId: 'u-123',
        action: 'submit',
        payload: { count: 5, items: ['a', 'b'] },
      },
    };

    const result = redactSentryEvent(event);

    expect(result.request?.data).toEqual({
      userId: 'u-123',
      action: 'submit',
      payload: { count: 5, items: ['a', 'b'] },
    });
  });

  it('redacts secret-shaped fields in breadcrumb data', () => {
    const event = baseEvent();
    event.breadcrumbs = [
      {
        category: 'http',
        message: 'POST /api/auth/login',
        data: {
          method: 'POST',
          url: 'https://example.com/api/auth/login',
          password: 'p@ssw0rd',
          authorization: 'Bearer xyz',
        },
      },
      {
        category: 'console',
        message: 'just a string',
      },
    ];

    const result = redactSentryEvent(event);
    const crumb = result.breadcrumbs?.[0];

    expect(crumb?.data?.method).toBe('POST');
    expect(crumb?.data?.url).toBe('https://example.com/api/auth/login');
    expect(crumb?.data?.password).toBe('[REDACTED]');
    expect(crumb?.data?.authorization).toBe('[REDACTED]');
    // String-only breadcrumb passes through unchanged.
    expect(result.breadcrumbs?.[1].message).toBe('just a string');
  });

  it('is a no-op when request and breadcrumbs are absent', () => {
    const event = baseEvent();
    event.extra = { nodeVersion: 'v20' };

    const result = redactSentryEvent(event);

    expect(result).toEqual(event);
  });

  it('preserves other request fields (url, method, query_string, env)', () => {
    const event = baseEvent();
    event.request = {
      url: 'https://example.com/api/x',
      method: 'POST',
      query_string: 'a=1',
      env: { REMOTE_ADDR: '1.2.3.4' },
      headers: { 'x-trace-id': 'abc' },
    };

    const result = redactSentryEvent(event);

    expect(result.request?.url).toBe('https://example.com/api/x');
    expect(result.request?.method).toBe('POST');
    expect(result.request?.query_string).toBe('a=1');
    expect(result.request?.env).toEqual({ REMOTE_ADDR: '1.2.3.4' });
    expect(result.request?.headers?.['x-trace-id']).toBe('abc');
  });
});
