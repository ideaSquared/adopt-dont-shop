import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LogEvent } from '@ideasquared/log';

import { createLokiSink, type LokiSink } from './loki-sink.js';

const event = (overrides: Partial<LogEvent> = {}): LogEvent => ({
  timestamp: '2026-11-14T18:22:12.984Z',
  level: 'info',
  service: 'svc',
  message: 'hello',
  ...overrides,
});

type Call = { url: string; init: RequestInit };
const bodyOf = (call: Call) =>
  JSON.parse(String(call.init.body)) as {
    streams: { stream: Record<string, string>; values: [string, string][] }[];
  };

describe('createLokiSink', () => {
  let sink: LokiSink | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await sink?.close();
    sink = undefined;
    vi.useRealTimers();
  });

  const make = (fetchImpl: (url: string, init: RequestInit) => Promise<{ ok: boolean }>) => {
    const calls: Call[] = [];
    const errors: string[] = [];
    sink = createLokiSink({
      url: 'http://loki:3100',
      labels: { service: 'svc', env: 'test' },
      fetch: (url, init) => {
        calls.push({ url, init });
        return fetchImpl(url, init);
      },
      onError: line => errors.push(line),
    });
    return { sink, calls, errors };
  };

  it('batches events and pushes them on the interval, grouped by level label', async () => {
    const { sink: s, calls } = make(async () => ({ ok: true }));

    s(event({ message: 'one' }));
    s(event({ message: 'two' }));
    s(event({ level: 'error', message: 'three' }));
    expect(calls).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(5_000);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('http://loki:3100/loki/api/v1/push');
    expect(calls[0]?.init.method).toBe('POST');
    const streams = bodyOf(calls[0] as Call).streams;
    expect(streams.map(x => x.stream)).toEqual([
      { service: 'svc', env: 'test', level: 'info' },
      { service: 'svc', env: 'test', level: 'error' },
    ]);
    expect(streams[0]?.values).toHaveLength(2);
    const [ts, line] = streams[0]?.values[0] as [string, string];
    expect(ts).toBe('1794680532984000000');
    expect(JSON.parse(line)).toMatchObject({ message: 'one', service: 'svc' });
  });

  it('pushes early when a batch fills up', async () => {
    const calls: Call[] = [];
    sink = createLokiSink({
      url: 'http://loki:3100',
      labels: { service: 'svc' },
      maxBatchSize: 2,
      fetch: async (url, init) => {
        calls.push({ url, init });
        return { ok: true };
      },
    });
    sink(event());
    sink(event());
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(1);
  });

  it('sends nothing when there is nothing buffered', async () => {
    const { calls } = make(async () => ({ ok: true }));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(calls).toHaveLength(0);
  });

  it('turns credentials in the URL into a basic-auth header and strips them from the URL', async () => {
    const calls: Call[] = [];
    sink = createLokiSink({
      url: 'http://user:pa%20ss@loki:3100/',
      labels: {},
      fetch: async (url, init) => {
        calls.push({ url, init });
        return { ok: true };
      },
    });
    sink(event());
    await sink.flush();
    expect(calls[0]?.url).toBe('http://loki:3100/loki/api/v1/push');
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Basic ${Buffer.from('user:pa ss').toString('base64')}`);
  });

  it('does not throw when Loki is down, reports once, and retries the same events later', async () => {
    let up = false;
    const {
      sink: s,
      calls,
      errors,
    } = make(async () => {
      if (!up) throw new Error('connect ECONNREFUSED');
      return { ok: true };
    });

    expect(() => s(event({ message: 'kept' }))).not.toThrow();
    await vi.advanceTimersByTimeAsync(5_000);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(errors).toEqual(['loki push failed; buffering logs and retrying']);

    up = true;
    await vi.advanceTimersByTimeAsync(60_000);

    const last = calls[calls.length - 1] as Call;
    expect(bodyOf(last).streams[0]?.values.map(v => JSON.parse(v[1]).message)).toEqual(['kept']);
    await s.flush();
    const sent = calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toHaveLength(sent);
  });

  it('treats a non-2xx response as a failure and keeps the events', async () => {
    let ok = false;
    const { sink: s, calls, errors } = make(async () => ({ ok }));
    s(event());
    await s.flush();
    expect(errors).toHaveLength(1);
    ok = true;
    await s.flush();
    expect(calls).toHaveLength(2);
    expect(bodyOf(calls[1] as Call).streams[0]?.values).toHaveLength(1);
  });

  it('drops the oldest events once the buffer is full', async () => {
    const calls: Call[] = [];
    sink = createLokiSink({
      url: 'http://loki:3100',
      labels: {},
      maxBuffered: 2,
      maxBatchSize: 100,
      fetch: async (url, init) => {
        calls.push({ url, init });
        return { ok: true };
      },
    });
    sink(event({ message: 'a' }));
    sink(event({ message: 'b' }));
    sink(event({ message: 'c' }));
    await sink.flush();
    const messages = bodyOf(calls[0] as Call).streams[0]?.values.map(v => JSON.parse(v[1]).message);
    expect(messages).toEqual(['b', 'c']);
  });

  it('flushes what is left on close', async () => {
    const { sink: s, calls } = make(async () => ({ ok: true }));
    s(event());
    await s.close();
    expect(calls).toHaveLength(1);
  });
});
