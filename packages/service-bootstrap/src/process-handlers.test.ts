import { afterEach, describe, expect, it, vi } from 'vitest';

import { installProcessErrorHandlers } from './process-handlers.js';

const makeLogger = () => {
  const errorCalls: Array<[string, unknown]> = [];
  const logger = {
    info: () => undefined,
    error: (msg: string, meta?: unknown) => errorCalls.push([msg, meta]),
    warn: () => undefined,
    debug: () => undefined,
    silly: () => undefined,
  } as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;
  return Object.assign(logger, { errorCalls });
};

// Flush the microtask + immediate queue so the handler's async teardown IIFE
// runs to completion (teardown → exit).
const flush = (): Promise<void> => new Promise<void>(resolve => setImmediate(resolve));

// Capture the listeners installProcessErrorHandlers registers WITHOUT letting
// them attach to the real process (mockReturnValue replaces the impl, so no
// call-through and nothing to leak between tests).
const captureRegistration = () => {
  const onSpy = vi.spyOn(process, 'on').mockReturnValue(process);
  const handlerFor = (event: string): ((arg: unknown) => void) | undefined => {
    const call = onSpy.mock.calls.find(([registeredEvent]) => registeredEvent === event);
    return call?.[1];
  };
  return { handlerFor };
};

describe('installProcessErrorHandlers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers both uncaughtException and unhandledRejection handlers', () => {
    const { handlerFor } = captureRegistration();

    installProcessErrorHandlers({
      logger: makeLogger(),
      onFatal: async () => undefined,
      exit: vi.fn(),
    });

    expect(typeof handlerFor('uncaughtException')).toBe('function');
    expect(typeof handlerFor('unhandledRejection')).toBe('function');
  });

  it('on uncaughtException: logs the cause, drains, then exits non-zero', async () => {
    const { handlerFor } = captureRegistration();
    const logger = makeLogger();
    const onFatal = vi.fn(async () => undefined);
    const exit = vi.fn();

    installProcessErrorHandlers({ logger, onFatal, exit });
    handlerFor('uncaughtException')?.(new Error('idle client error'));
    await flush();

    expect(onFatal).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.errorCalls.some(([msg]) => msg.includes('uncaughtException'))).toBe(true);
  });

  it('on unhandledRejection: logs the cause, drains, then exits non-zero', async () => {
    const { handlerFor } = captureRegistration();
    const logger = makeLogger();
    const onFatal = vi.fn(async () => undefined);
    const exit = vi.fn();

    installProcessErrorHandlers({ logger, onFatal, exit });
    handlerFor('unhandledRejection')?.(new Error('boom'));
    await flush();

    expect(onFatal).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.errorCalls.some(([msg]) => msg.includes('unhandledRejection'))).toBe(true);
  });

  it('still exits non-zero when the teardown itself throws', async () => {
    const { handlerFor } = captureRegistration();
    const logger = makeLogger();
    const onFatal = vi.fn(async () => {
      throw new Error('drain failed');
    });
    const exit = vi.fn();

    installProcessErrorHandlers({ logger, onFatal, exit });
    handlerFor('uncaughtException')?.(new Error('boom'));
    await flush();

    expect(exit).toHaveBeenCalledWith(1);
    expect(
      logger.errorCalls.some(([msg]) => msg.includes('teardown during fatal handler failed'))
    ).toBe(true);
  });

  it('does not re-enter teardown when a second fatal event fires mid-drain', async () => {
    const { handlerFor } = captureRegistration();
    let resolveTeardown: (() => void) | undefined;
    const onFatal = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveTeardown = resolve;
        })
    );
    const exit = vi.fn();

    installProcessErrorHandlers({ logger: makeLogger(), onFatal, exit });
    handlerFor('uncaughtException')?.(new Error('first')); // starts teardown (pending)
    handlerFor('unhandledRejection')?.(new Error('second')); // must be ignored while draining
    resolveTeardown?.();
    await flush();

    expect(onFatal).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });
});
