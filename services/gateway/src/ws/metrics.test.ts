import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { __resetMetricsForTest, getMetricsRegistry } from '@adopt-dont-shop/observability';

import { getSocketAdapterRedisUpGauge, trackSocketAdapterRedis } from './metrics.js';

// A minimal stand-in for the ioredis connection surface trackSocketAdapterRedis
// observes: an EventEmitter with a `status` string. A real ioredis client is
// itself an EventEmitter and exposes `.status`, so this is structurally the
// same contract without pulling ioredis into a unit test.
const makeClient = (status?: string): EventEmitter & { status?: string } => {
  const client = new EventEmitter() as EventEmitter & { status?: string };
  client.status = status;
  return client;
};

const readGauge = async (client: 'pub' | 'sub'): Promise<number | undefined> => {
  const metric = getMetricsRegistry().getSingleMetric('gateway_ws_redis_adapter_up');
  const snapshot = await metric?.get();
  return snapshot?.values.find(v => v.labels.client === client)?.value;
};

describe('socket-adapter Redis health gauge (ADS-1251)', () => {
  beforeEach(() => {
    __resetMetricsForTest();
  });

  afterEach(() => {
    __resetMetricsForTest();
  });

  it('exposes a single named gauge labelled by client (pub | sub)', () => {
    const gauge = getSocketAdapterRedisUpGauge();
    // Idempotent within a registry: a second call returns the same instance
    // rather than throwing "metric already registered".
    expect(getSocketAdapterRedisUpGauge()).toBe(gauge);
    expect(getMetricsRegistry().getSingleMetric('gateway_ws_redis_adapter_up')).toBe(gauge);
  });

  it('seeds 0 for a client that is not yet ready, then flips to 1 on `ready`', async () => {
    const client = makeClient('connecting');
    trackSocketAdapterRedis(client, 'pub');

    expect(await readGauge('pub')).toBe(0);

    client.emit('ready');
    expect(await readGauge('pub')).toBe(1);
  });

  it('seeds 1 when the client is already `ready` at wire-up time', async () => {
    const client = makeClient('ready');
    trackSocketAdapterRedis(client, 'pub');

    expect(await readGauge('pub')).toBe(1);
  });

  it('flips to 0 on `close` and back to 1 on the following `ready` (a reconnect blip)', async () => {
    const client = makeClient('ready');
    trackSocketAdapterRedis(client, 'pub');
    expect(await readGauge('pub')).toBe(1);

    client.emit('close');
    expect(await readGauge('pub')).toBe(0);

    client.emit('ready');
    expect(await readGauge('pub')).toBe(1);
  });

  it('flips to 0 on `end` (adapter Redis gave up / was disconnected)', async () => {
    const client = makeClient('ready');
    trackSocketAdapterRedis(client, 'sub');
    expect(await readGauge('sub')).toBe(1);

    client.emit('end');
    expect(await readGauge('sub')).toBe(0);
  });

  it('tracks the pub and sub connections independently', async () => {
    const pub = makeClient('ready');
    const sub = makeClient('connecting');
    trackSocketAdapterRedis(pub, 'pub');
    trackSocketAdapterRedis(sub, 'sub');

    expect(await readGauge('pub')).toBe(1);
    expect(await readGauge('sub')).toBe(0);

    // The sub connection recovering must not disturb pub's series.
    sub.emit('ready');
    expect(await readGauge('sub')).toBe(1);
    expect(await readGauge('pub')).toBe(1);

    // ...and pub dropping must not disturb sub's.
    pub.emit('close');
    expect(await readGauge('pub')).toBe(0);
    expect(await readGauge('sub')).toBe(1);
  });
});
