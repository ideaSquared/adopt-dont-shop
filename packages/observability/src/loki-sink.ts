// Loki push-API sink for @ideasquared/log. Replaces winston-loki with the same wire behaviour:
// POST {LOKI_URL}/loki/api/v1/push as JSON, batched on a timer (5s by default), stream labels
// {service, env} plus one `level` label per event, and basic auth taken from credentials in the URL.
//
// It is non-blocking and never throws: events are buffered, a failed push is re-queued (oldest events
// are dropped once the buffer is full) and retried with backoff, and a push failure is reported on
// stderr as a fixed line. A Loki outage degrades the service to console-only logging.

import type { LogEvent, Sink } from '@ideasquared/log';

const PUSH_PATH = '/loki/api/v1/push';
const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_MAX_BATCH = 500;
const DEFAULT_MAX_BUFFERED = 10_000;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_BACKOFF_MS = 60_000;

type FetchLike = (url: string, init: RequestInit) => Promise<{ ok: boolean }>;

export type LokiSinkOptions = {
  // Base URL of Loki, e.g. http://loki:3100. Credentials in the URL become a basic-auth header.
  url: string;
  // Stream labels sent with every event. `level` is added per event.
  labels: Readonly<Record<string, string>>;
  intervalMs?: number;
  maxBatchSize?: number;
  maxBuffered?: number;
  timeoutMs?: number;
  fetch?: FetchLike;
  onError?: (line: string) => void;
};

export type LokiSink = Sink & {
  // Push everything buffered now. Resolves when the push has finished, whether or not it succeeded.
  flush: () => Promise<void>;
  // Stop the timer and flush what is left.
  close: () => Promise<void>;
};

type Entry = { level: string; ts: string; line: string };

const toNanoseconds = (isoTimestamp: string): string => {
  const ms = Date.parse(isoTimestamp);
  return `${Number.isNaN(ms) ? Date.now() : ms}000000`;
};

const buildStreams = (entries: readonly Entry[], labels: Readonly<Record<string, string>>) => {
  const levels = [...new Set(entries.map(entry => entry.level))];
  return levels.map(level => ({
    stream: { ...labels, level },
    values: entries.filter(entry => entry.level === level).map(entry => [entry.ts, entry.line]),
  }));
};

const parseEndpoint = (url: string): { endpoint: string; authorization?: string } => {
  const parsed = new URL(url);
  const authorization =
    parsed.username && parsed.password
      ? `Basic ${Buffer.from(`${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`).toString('base64')}`
      : undefined;
  parsed.username = '';
  parsed.password = '';
  return {
    endpoint: `${parsed.toString().replace(/\/+$/, '')}${PUSH_PATH}`,
    ...(authorization ? { authorization } : {}),
  };
};

export const createLokiSink = (options: LokiSinkOptions): LokiSink => {
  const { endpoint, authorization } = parseEndpoint(options.url);
  const send: FetchLike = options.fetch ?? ((url, init) => fetch(url, init));
  const report =
    options.onError ??
    ((line: string) => {
      // The sink cannot log through itself: this fixed line is its own failure channel.
      // eslint-disable-next-line no-console, no-restricted-properties -- Loki sink failure channel, fixed message only
      console.error(line);
    });
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const maxBatch = options.maxBatchSize ?? DEFAULT_MAX_BATCH;
  const maxBuffered = options.maxBuffered ?? DEFAULT_MAX_BUFFERED;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let buffer: Entry[] = [];
  let inFlight: Promise<void> | null = null;
  let failures = 0;
  let retryAt = 0;

  const push = async (batch: readonly Entry[]): Promise<boolean> => {
    try {
      const response = await send(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(authorization ? { authorization } : {}),
        },
        body: JSON.stringify({ streams: buildStreams(batch, options.labels) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const drain = async (force: boolean): Promise<void> => {
    if (buffer.length === 0 || (!force && Date.now() < retryAt)) return;
    const batch = buffer;
    buffer = [];
    if (await push(batch)) {
      failures = 0;
      retryAt = 0;
      return;
    }
    // Put the failed batch back in front of anything logged meanwhile, dropping the oldest on overflow.
    buffer = [...batch, ...buffer].slice(-maxBuffered);
    failures += 1;
    retryAt = Date.now() + Math.min(MAX_BACKOFF_MS, intervalMs * 2 ** failures);
    if (failures === 1) report('loki push failed; buffering logs and retrying');
  };

  const flushWith = (force: boolean): Promise<void> => {
    inFlight = (inFlight ?? Promise.resolve()).then(() => drain(force));
    const current = inFlight;
    void current.finally(() => {
      if (inFlight === current) inFlight = null;
    });
    return current;
  };

  const timer = setInterval(() => void flushWith(false), intervalMs);
  timer.unref();

  const sink = (event: LogEvent): void => {
    buffer.push({
      level: event.level,
      ts: toNanoseconds(event.timestamp),
      line: JSON.stringify(event),
    });
    if (buffer.length > maxBuffered) buffer = buffer.slice(-maxBuffered);
    if (buffer.length >= maxBatch) void flushWith(false);
  };

  return Object.assign(sink, {
    flush: () => flushWith(true),
    close: () => {
      clearInterval(timer);
      return flushWith(true);
    },
  });
};
