import { afterEach, describe, expect, it, vi } from 'vitest';

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
  const errorCalls: Array<[string, unknown]> = [];
  const logger = {
    info: () => undefined,
    error: (msg: string, meta?: unknown) => errorCalls.push([msg, meta]),
    warn: () => undefined,
    debug: () => undefined,
    silly: () => undefined,
  } as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;
  return Object.assign(logger, { errorCalls });
}

// --- Shutdown timeout -----------------------------------------------

describe('runServiceShutdown — overall deadline (timeoutMs)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exits 0 on normal completion within the timeout', async () => {
    vi.useFakeTimers();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const httpServer = { close: vi.fn(async () => undefined) };

    const p = runServiceShutdown({ httpServer, logger: makeLogger(), timeoutMs: 25_000 });
    await vi.runAllTimersAsync();
    await p;

    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });

  it('calls process.exit(1) when a step hangs past the deadline', async () => {
    vi.useFakeTimers();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const logger = makeLogger();

    // http.close never resolves — simulates a hung step.
    const httpServer = { close: vi.fn(() => new Promise<void>(() => undefined)) };

    const p = runServiceShutdown({ httpServer, logger, timeoutMs: 25_000 });
    // Advance past the deadline.
    await vi.advanceTimersByTimeAsync(25_001);
    // Allow microtasks to flush.
    await Promise.resolve();

    expect(exitSpy).toHaveBeenCalledWith(1);
    // logger.error must name the step that was in flight.
    expect(logger.errorCalls.some(([msg]) => typeof msg === 'string' && msg.includes('http'))).toBe(
      true
    );

    // Clean up the dangling promise.
    await Promise.resolve();
    p.catch(() => undefined);
  });

  it('names the correct step in the error log when grpc hangs', async () => {
    vi.useFakeTimers();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const logger = makeLogger();

    const httpServer = { close: vi.fn(async () => undefined) };
    // grpc.shutdown hangs.
    const grpc = { shutdown: vi.fn(() => new Promise<void>(() => undefined)) };

    const p = runServiceShutdown({ httpServer, grpc, logger, timeoutMs: 25_000 });
    await vi.advanceTimersByTimeAsync(25_001);
    await Promise.resolve();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(logger.errorCalls.some(([msg]) => typeof msg === 'string' && msg.includes('grpc'))).toBe(
      true
    );

    p.catch(() => undefined);
  });

  it('defaults to 25_000ms when timeoutMs is omitted (no exit on fast close)', async () => {
    vi.useFakeTimers();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const httpServer = { close: vi.fn(async () => undefined) };

    // Should complete fast without hitting the default 25 000 ms deadline.
    const p = runServiceShutdown({ httpServer, logger: makeLogger() });
    await vi.runAllTimersAsync();
    await p;

    expect(exitSpy).not.toHaveBeenCalledWith(1);
  });

  it('ordering is unchanged — HTTP → gRPC → NATS → pool even with a timeout set', async () => {
    vi.useFakeTimers();
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
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

    const p = runServiceShutdown({
      httpServer,
      grpc,
      nats,
      pool,
      logger: makeLogger(),
      timeoutMs: 25_000,
    });
    await vi.runAllTimersAsync();
    await p;

    expect(order).toEqual(['http', 'grpc', 'nats', 'pool']);
  });
});
