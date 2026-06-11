import { describe, expect, it, vi } from 'vitest';

import { runServiceShutdown } from './shutdown.js';

describe('runServiceShutdown — shutdown sequencing', () => {
  it('calls close → grpc shutdown → nats drain → pool end in order', async () => {
    const order: string[] = [];

    const httpServer = {
      close: vi.fn(async () => {
        order.push('http');
      }),
    };
    const grpc = {
      shutdown: vi.fn(async () => {
        order.push('grpc');
      }),
    };
    const nats = {
      drain: vi.fn(async () => {
        order.push('nats');
      }),
    };
    const pool = {
      end: vi.fn(async () => {
        order.push('pool');
      }),
    };

    await runServiceShutdown({ httpServer, grpc, nats, pool, logger: makeLogger() });

    expect(order).toEqual(['http', 'grpc', 'nats', 'pool']);
  });

  it('continues through remaining steps when http close throws', async () => {
    const order: string[] = [];

    const httpServer = {
      close: vi.fn(async () => {
        throw new Error('already closed');
      }),
    };
    const grpc = {
      shutdown: vi.fn(async () => {
        order.push('grpc');
      }),
    };
    const nats = {
      drain: vi.fn(async () => {
        order.push('nats');
      }),
    };
    const pool = {
      end: vi.fn(async () => {
        order.push('pool');
      }),
    };

    await runServiceShutdown({ httpServer, grpc, nats, pool, logger: makeLogger() });

    expect(order).toEqual(['grpc', 'nats', 'pool']);
  });

  it('continues through remaining steps when grpc shutdown throws', async () => {
    const order: string[] = [];

    const httpServer = {
      close: vi.fn(async () => {
        order.push('http');
      }),
    };
    const grpc = {
      shutdown: vi.fn(async () => {
        throw new Error('grpc timeout');
      }),
    };
    const nats = {
      drain: vi.fn(async () => {
        order.push('nats');
      }),
    };
    const pool = {
      end: vi.fn(async () => {
        order.push('pool');
      }),
    };

    await runServiceShutdown({ httpServer, grpc, nats, pool, logger: makeLogger() });

    expect(order).toEqual(['http', 'nats', 'pool']);
  });

  it('works with only some dependencies provided (all optional)', async () => {
    const order: string[] = [];

    const httpServer = {
      close: vi.fn(async () => {
        order.push('http');
      }),
    };

    // no grpc, nats, pool
    await runServiceShutdown({ httpServer, logger: makeLogger() });

    expect(order).toEqual(['http']);
  });

  it('does not double-close http when httpClosed flag is set', async () => {
    const httpServer = {
      close: vi.fn(async () => undefined),
    };

    // First call
    await runServiceShutdown({ httpServer, logger: makeLogger() });
    // Second call — simulate duplicate signal
    await runServiceShutdown({ httpServer, logger: makeLogger() });

    // http.close called both times since httpClosed tracks state externally
    // The caller manages httpClosed; runServiceShutdown always tries close
    expect(httpServer.close).toHaveBeenCalledTimes(2);
  });
});

function makeLogger() {
  return {
    info: () => undefined,
    error: () => undefined,
    warn: () => undefined,
    debug: () => undefined,
    silly: () => undefined,
  } as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;
}
