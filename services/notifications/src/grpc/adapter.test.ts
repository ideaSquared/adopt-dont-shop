import { Metadata, status, type ServerUnaryCall, type sendUnaryData } from '@grpc/grpc-js';
import { describe, expect, it, vi } from 'vitest';

import type { Logger } from 'winston';

import { adapt } from './adapter.js';
import { HandlerError, type HandlerDeps } from './handlers.js';

// Quiet logger that records the calls we care about. We assert the
// adapter logs the unknown-error case so ops always have something to
// chase even when the caller saw the scrubbed INTERNAL message.
function makeLogger() {
  const calls: Array<{ level: string; msg: string; meta?: unknown }> = [];
  const logger = {
    info: (msg: string, meta?: unknown) => calls.push({ level: 'info', msg, meta }),
    error: (msg: string, meta?: unknown) => calls.push({ level: 'error', msg, meta }),
    warn: (msg: string, meta?: unknown) => calls.push({ level: 'warn', msg, meta }),
    debug: (msg: string, meta?: unknown) => calls.push({ level: 'debug', msg, meta }),
    silly: (msg: string, meta?: unknown) => calls.push({ level: 'silly', msg, meta }),
  } as unknown as Logger;
  return { logger, calls };
}

function buildMetadata(headers: Record<string, string>): Metadata {
  const m = new Metadata();
  for (const [k, v] of Object.entries(headers)) m.set(k, v);
  return m;
}

const VALID_PRINCIPAL_HEADERS = {
  'x-user-id': 'usr-1',
  'x-user-roles': 'adopter',
  'x-user-permissions': 'notifications.read',
};

// Minimal deps stub — handlers under adapter aren't going to call into
// pg / nats in these tests because we hand-roll the handler functions.
const deps = { pool: {}, nats: {} } as unknown as HandlerDeps;

function makeCall<Req>(request: Req, metadata: Metadata): ServerUnaryCall<Req, unknown> {
  return { request, metadata } as ServerUnaryCall<Req, unknown>;
}

describe('adapt — happy path', () => {
  it('passes the request and extracted principal to the handler, then sends the response via callback(null, res)', async () => {
    const handler = vi.fn(async (_deps, principal, req: { ping: string }) => ({
      pong: req.ping,
      asUser: principal.userId,
    }));

    const { logger } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({ ping: 'hi' }, buildMetadata(VALID_PRINCIPAL_HEADERS)), callback);

    // Wait for the IIFE to resolve.
    await new Promise(r => setImmediate(r));

    expect(handler).toHaveBeenCalledTimes(1);
    const [, principalArg, reqArg] = handler.mock.calls[0];
    expect(principalArg.userId).toBe('usr-1');
    expect(reqArg).toEqual({ ping: 'hi' });

    expect(callback).toHaveBeenCalledTimes(1);
    const [err, res] = vi.mocked(callback).mock.calls[0];
    expect(err).toBeNull();
    expect(res).toEqual({ pong: 'hi', asUser: 'usr-1' });
  });
});

describe('adapt — error code mapping', () => {
  it('translates MissingPrincipalError → UNAUTHENTICATED', async () => {
    const handler = vi.fn();
    const { logger } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    // No headers — extractPrincipal throws MissingPrincipalError.
    wrapped(makeCall({}, buildMetadata({})), callback);

    await new Promise(r => setImmediate(r));

    expect(handler).not.toHaveBeenCalled();
    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: status.UNAUTHENTICATED });
  });

  it('translates HandlerError("INVALID_ARGUMENT") → INVALID_ARGUMENT', async () => {
    const handler = vi.fn(async () => {
      throw new HandlerError('INVALID_ARGUMENT', 'bad arg');
    });
    const { logger } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_PRINCIPAL_HEADERS)), callback);

    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({
      code: status.INVALID_ARGUMENT,
      details: 'bad arg',
      message: 'bad arg',
    });
  });

  it('translates HandlerError("PERMISSION_DENIED") → PERMISSION_DENIED', async () => {
    const handler = vi.fn(async () => {
      throw new HandlerError('PERMISSION_DENIED', 'nope');
    });
    const { logger } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_PRINCIPAL_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: status.PERMISSION_DENIED });
  });

  it('translates HandlerError("NOT_FOUND") → NOT_FOUND', async () => {
    const handler = vi.fn(async () => {
      throw new HandlerError('NOT_FOUND', 'gone');
    });
    const { logger } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_PRINCIPAL_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: status.NOT_FOUND });
  });

  it('translates unknown errors → INTERNAL with a scrubbed message, AND logs the original via logger.error', async () => {
    const handler = vi.fn(async () => {
      throw new Error('pg: connection lost');
    });
    const { logger, calls } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_PRINCIPAL_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: status.INTERNAL, details: 'internal error' });
    expect((err as Error).message).toBe('internal error'); // scrubbed

    // Ops still gets the real error via the logger.
    const errorCall = calls.find(c => c.level === 'error');
    expect(errorCall).toBeDefined();
    expect(errorCall!.msg).toContain('unhandled');
  });
});
