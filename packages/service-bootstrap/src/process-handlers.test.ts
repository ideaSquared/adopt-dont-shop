import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerFatalErrorHandlers } from './process-handlers.js';

describe('registerFatalErrorHandlers', () => {
  afterEach(() => {
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    vi.restoreAllMocks();
  });

  it('logs, runs the shutdown sequence, and exits 1 on uncaughtException', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const httpServer = { close: vi.fn(async () => undefined) };
    const pool = { end: vi.fn(async () => undefined) };
    const logger = makeLogger();

    registerFatalErrorHandlers({ httpServer, pool, logger });

    const err = new Error('idle client error');
    process.emit('uncaughtException', err);
    await flushAsync();

    expect(logger.errorCalls.some(([msg]) => msg.includes('uncaughtException'))).toBe(true);
    expect(httpServer.close).toHaveBeenCalled();
    expect(pool.end).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('logs, runs the shutdown sequence, and exits 1 on unhandledRejection', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const httpServer = { close: vi.fn(async () => undefined) };
    const logger = makeLogger();

    registerFatalErrorHandlers({ httpServer, logger });

    process.emit(
      'unhandledRejection',
      new Error('boom'),
      Promise.reject().catch(() => undefined)
    );
    await flushAsync();

    expect(logger.errorCalls.some(([msg]) => msg.includes('unhandledRejection'))).toBe(true);
    expect(httpServer.close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('still exits 1 even when a shutdown step throws', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const httpServer = {
      close: vi.fn(async () => {
        throw new Error('already closed');
      }),
    };
    const logger = makeLogger();

    registerFatalErrorHandlers({ httpServer, logger });

    process.emit('uncaughtException', new Error('boom'));
    await flushAsync();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

function flushAsync(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

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
