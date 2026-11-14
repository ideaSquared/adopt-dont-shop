import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getActiveSpanMock } = vi.hoisted(() => ({ getActiveSpanMock: vi.fn() }));
vi.mock('@opentelemetry/api', () => ({
  trace: { getActiveSpan: getActiveSpanMock },
}));

import { BASE_LOG_FIELDS, createLogger, memorySink } from './logger.js';

const ENV_KEYS = ['LOG_LEVEL', 'LOKI_URL', 'NODE_ENV'] as const;

describe('createLogger', () => {
  const saved = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]));

  beforeEach(() => {
    for (const k of ENV_KEYS) delete process.env[k];
    getActiveSpanMock.mockReset();
    getActiveSpanMock.mockReturnValue(undefined);
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stamps the service name and declared fields on every event', () => {
    const sink = memorySink();
    const logger = createLogger({ serviceName: 'service.test', fields: ['petId'], sink });

    logger.info('pet archived', { petId: 'p1' });

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toMatchObject({
      level: 'info',
      service: 'service.test',
      message: 'pet archived',
      meta: { petId: 'p1' },
    });
  });

  it('refuses to declare a field that holds personal data', () => {
    expect(() =>
      createLogger({ serviceName: 'svc', fields: ['email'], sink: memorySink() })
    ).toThrow(/personal data/);
  });

  it('keeps the base field list free of personal-data names', () => {
    expect(() =>
      createLogger({ serviceName: 'svc', fields: BASE_LOG_FIELDS, sink: memorySink() })
    ).not.toThrow();
  });

  it('writes one JSON line per event to the console', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const logger = createLogger({ serviceName: 'svc', fields: ['count'] });

    logger.info('batch done', { count: 3 });

    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0]?.[0]);
    expect(line.endsWith('\n')).toBe(true);
    expect(line.trimEnd()).not.toContain('\n');
    expect(JSON.parse(line) as unknown).toMatchObject({
      service: 'svc',
      message: 'batch done',
      meta: { count: 3 },
    });
  });

  it('logs the error passed as the third argument', () => {
    const sink = memorySink();
    const logger = createLogger({ serviceName: 'svc', fields: [], sink });

    logger.error('job failed', {}, new Error('boom'));

    expect(sink.events[0]?.error).toMatchObject({ type: 'Error', message: 'boom' });
  });

  it('uses `info` as the level by default outside development', () => {
    process.env.NODE_ENV = 'production';
    const sink = memorySink();
    const logger = createLogger({ serviceName: 'svc', fields: [], sink });
    logger.debug('hidden');
    logger.info('shown');
    expect(sink.events.map(e => e.message)).toEqual(['shown']);
  });

  it('uses `debug` as the level when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    const sink = memorySink();
    createLogger({ serviceName: 'svc', fields: [], sink }).debug('shown');
    expect(sink.events).toHaveLength(1);
  });

  it('honours LOG_LEVEL, including the legacy `http` and `silly` names', () => {
    process.env.LOG_LEVEL = 'warn';
    const warnSink = memorySink();
    const warnLogger = createLogger({ serviceName: 'svc', fields: [], sink: warnSink });
    warnLogger.info('hidden');
    warnLogger.warn('shown');
    expect(warnSink.events.map(e => e.message)).toEqual(['shown']);

    process.env.LOG_LEVEL = 'silly';
    const sillySink = memorySink();
    createLogger({ serviceName: 'svc', fields: [], sink: sillySink }).debug('shown');
    expect(sillySink.events).toHaveLength(1);
  });

  it('ignores unknown LOG_LEVEL values and falls back to the env-based default', () => {
    process.env.LOG_LEVEL = 'screaming';
    process.env.NODE_ENV = 'production';
    const sink = memorySink();
    createLogger({ serviceName: 'svc', fields: [], sink }).debug('hidden');
    expect(sink.events).toHaveLength(0);
  });

  it('opts.logLevel overrides LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'warn';
    const sink = memorySink();
    createLogger({ serviceName: 'svc', fields: [], logLevel: 'error', sink }).warn('hidden');
    expect(sink.events).toHaveLength(0);
  });

  it('ships to Loki with service/env/level labels when LOKI_URL is set', async () => {
    process.env.LOKI_URL = 'http://loki:3100';
    process.env.NODE_ENV = 'production';
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { flushLogs } = await import('./logger.js');

    createLogger({ serviceName: 'svc', fields: [] }).info('hello');
    await flushLogs();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://loki:3100/loki/api/v1/push');
    const body = JSON.parse(String(init.body)) as {
      streams: { stream: Record<string, string>; values: string[][] }[];
    };
    expect(body.streams[0]?.stream).toEqual({ service: 'svc', env: 'production', level: 'info' });
  });

  describe('trace-context stamping (ADS-1327)', () => {
    it('does not add trace_id/span_id when there is no active span', () => {
      const sink = memorySink();
      createLogger({ serviceName: 'svc', fields: [], sink }).info('no span here');
      expect(sink.events[0]?.meta).toBeUndefined();
    });

    it('stamps trace_id/span_id from the active OTel span, when there is one', () => {
      getActiveSpanMock.mockReturnValue({
        spanContext: () => ({ traceId: 'trace-abc123', spanId: 'span-def456' }),
      });
      const sink = memorySink();
      createLogger({ serviceName: 'svc', fields: ['count'], sink }).info('in a trace', {
        count: 1,
      });
      expect(sink.events[0]?.meta).toEqual({
        count: 1,
        trace_id: 'trace-abc123',
        span_id: 'span-def456',
      });
    });

    it('does not stamp when the active span has no traceId', () => {
      getActiveSpanMock.mockReturnValue({ spanContext: () => ({ traceId: '', spanId: '' }) });
      const sink = memorySink();
      createLogger({ serviceName: 'svc', fields: [], sink }).info('degenerate span context');
      expect(sink.events[0]?.meta).toBeUndefined();
    });
  });
});
