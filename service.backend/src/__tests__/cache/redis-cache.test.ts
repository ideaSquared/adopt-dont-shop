import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the redis module before importing the cache module so the
// mocks are wired in before any module-level Redis access.
vi.mock('../../lib/redis', () => {
  const store = new Map<string, string>();
  const fakeRedis = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    incr: vi.fn(async (key: string) => {
      const current = parseInt(store.get(key) ?? '1', 10);
      const next = String(current + 1);
      store.set(key, next);
      return next;
    }),
    __store: store,
  };
  return {
    getRedis: vi.fn(() => fakeRedis),
    isRedisReady: vi.fn(() => true),
    ensureRedisReady: vi.fn(async () => true),
    __fakeRedis: fakeRedis,
  };
});

import { cached, invalidateNamespace, __test__ } from '../../cache/redis-cache';
import * as redisModule from '../../lib/redis';

const fakeRedis = (redisModule as unknown as { __fakeRedis: { __store: Map<string, string> } })
  .__fakeRedis;

describe('redis-cache [ADS-479]', () => {
  beforeEach(() => {
    fakeRedis.__store.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    fakeRedis.__store.clear();
  });

  it('produces stable keys regardless of arg property order', () => {
    const a = __test__.hashArgs({ rescueId: 'r1', page: 2 });
    const b = __test__.hashArgs({ page: 2, rescueId: 'r1' });
    expect(a).toBe(b);
  });

  it('returns the loader result on cache miss and writes through', async () => {
    const loader = vi.fn(async () => ({ items: [1, 2, 3] }));

    const first = await cached({ namespace: 'pets:list', args: { page: 1 } }, loader);
    expect(first).toEqual({ items: [1, 2, 3] });
    expect(loader).toHaveBeenCalledTimes(1);

    const second = await cached({ namespace: 'pets:list', args: { page: 1 } }, loader);
    expect(second).toEqual({ items: [1, 2, 3] });
    // Second call should be served from cache.
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('treats different namespaces as independent', async () => {
    const loaderA = vi.fn(async () => ({ kind: 'a' }));
    const loaderB = vi.fn(async () => ({ kind: 'b' }));

    await cached({ namespace: 'pets:list', args: { page: 1 } }, loaderA);
    await cached({ namespace: 'rescues:list', args: { page: 1 } }, loaderB);

    expect(loaderA).toHaveBeenCalledTimes(1);
    expect(loaderB).toHaveBeenCalledTimes(1);
  });

  it('invalidates a namespace by bumping the version stamp', async () => {
    const loader = vi.fn(async () => ({ items: [1] }));
    await cached({ namespace: 'pets:list', args: { page: 1 } }, loader);
    expect(loader).toHaveBeenCalledTimes(1);

    await invalidateNamespace('pets:list');

    await cached({ namespace: 'pets:list', args: { page: 1 } }, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('falls through to the loader when Redis is not ready', async () => {
    vi.mocked(redisModule.ensureRedisReady).mockResolvedValueOnce(false);
    const loader = vi.fn(async () => ({ items: [42] }));

    const result = await cached({ namespace: 'discovery:queue', args: {} }, loader);
    expect(result).toEqual({ items: [42] });
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
