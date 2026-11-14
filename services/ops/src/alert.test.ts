import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { createLogger, memorySink } from '@adopt-dont-shop/observability';

import { sendAlert } from './alert.js';
import { LOG_FIELDS } from './logger.js';
import { jsonResponse, makeFakeFetch, SILENT_LOGGER } from './test-support.js';

const URL = 'https://bot.example/alert';
const SECRET = 'shared-test-secret';
const alert = {
  severity: 'warning',
  title: 'ops break-glass unlock (prod)',
  details: 'ticket: ADS-123',
  source: 'service-ops-prod',
} as const;

describe('sendAlert', () => {
  it('posts the ads alert to ALERT_URL signed with the HMAC of the raw body', async () => {
    const fake = makeFakeFetch({ [URL]: () => jsonResponse({ ok: true }) });

    const delivered = await sendAlert(
      { url: URL, secret: SECRET, fetchFn: fake.fetchFn, logger: SILENT_LOGGER },
      alert
    );

    expect(delivered).toBe(true);
    const [call] = fake.calls;
    expect(call.method).toBe('POST');
    expect(JSON.parse(call.body ?? '{}')).toEqual({ project: 'ads', ...alert });
    const expected = createHmac('sha256', SECRET)
      .update(call.body ?? '')
      .digest('hex');
    expect(call.headers['x-alert-signature-256']).toBe(`sha256=${expected}`);
  });

  it('reports a non-2xx answer as not delivered', async () => {
    const fake = makeFakeFetch({ [URL]: () => jsonResponse({}, 401) });
    expect(
      await sendAlert(
        { url: URL, secret: SECRET, fetchFn: fake.fetchFn, logger: SILENT_LOGGER },
        alert
      )
    ).toBe(false);
  });

  it('reports a network failure as not delivered', async () => {
    const fake = makeFakeFetch({
      [URL]: () => {
        throw new Error('ECONNREFUSED');
      },
    });
    expect(
      await sendAlert(
        { url: URL, secret: SECRET, fetchFn: fake.fetchFn, logger: SILENT_LOGGER },
        alert
      )
    ).toBe(false);
  });

  it('skips quietly, sending nothing, when ALERT_URL or ALERT_SECRET is not set', async () => {
    const fake = makeFakeFetch({});
    const deps = { fetchFn: fake.fetchFn, logger: SILENT_LOGGER };

    expect(await sendAlert({ ...deps, url: undefined, secret: SECRET }, alert)).toBe(false);
    expect(await sendAlert({ ...deps, url: URL, secret: undefined }, alert)).toBe(false);
    expect(fake.calls).toHaveLength(0);
  });

  it('logs a failed send with a fixed message and the status only', async () => {
    const sink = memorySink();
    const logger = createLogger({ serviceName: 'service.ops.test', fields: LOG_FIELDS, sink });
    const fake = makeFakeFetch({ [URL]: () => jsonResponse({ secret: SECRET }, 403) });

    await sendAlert({ url: URL, secret: SECRET, fetchFn: fake.fetchFn, logger }, alert);

    expect(sink.events).toHaveLength(1);
    const line = JSON.stringify(sink.events[0]);
    expect(line).toContain('alert rejected');
    expect(line).toContain('403');
    expect(line).not.toContain(SECRET);
    expect(line).not.toContain(URL);
    expect(line).not.toContain(alert.details);
  });
});
