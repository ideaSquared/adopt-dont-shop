import { Metadata, status, type ServerUnaryCall, type sendUnaryData } from '@grpc/grpc-js';
import { describe, expect, it, vi } from 'vitest';

import type { Logger } from 'winston';

import { adapt, adaptUnauth } from './adapter.js';
import { HandlerError, type HandlerDeps } from './handlers.js';

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

// Minimal deps stub — handlers under adapter don't touch pg/nats in
// these tests because we hand-roll the handler function.
const deps = {
  pool: {},
  nats: {},
  passwordHasher: { compare: vi.fn() },
  tokenIssuer: { mint: vi.fn(), verifyAccess: vi.fn(), verifyRefresh: vi.fn() },
} as unknown as HandlerDeps;

function makeCall<Req>(request: Req, metadata: Metadata): ServerUnaryCall<Req, unknown> {
  return { request, metadata } as ServerUnaryCall<Req, unknown>;
}

describe('adapt (principal-required) — happy path', () => {
  it('passes the request and extracted principal to the handler', async () => {
    const handler = vi.fn(async (_deps, principal, req: { ping: string }) => ({
      pong: req.ping,
      asUser: principal.userId,
    }));

    const { logger } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({ ping: 'hi' }, buildMetadata(VALID_PRINCIPAL_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    expect(handler).toHaveBeenCalledTimes(1);
    const [err, res] = vi.mocked(callback).mock.calls[0];
    expect(err).toBeNull();
    expect(res).toEqual({ pong: 'hi', asUser: 'usr-1' });
  });
});

describe('adapt — error code mapping', () => {
  it('UNAUTHENTICATED when principal headers are missing', async () => {
    const handler = vi.fn();
    const { logger } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata({})), callback);
    await new Promise(r => setImmediate(r));

    expect(handler).not.toHaveBeenCalled();
    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: status.UNAUTHENTICATED });
  });

  it.each([
    ['INVALID_ARGUMENT', status.INVALID_ARGUMENT],
    ['UNAUTHENTICATED', status.UNAUTHENTICATED],
    ['PERMISSION_DENIED', status.PERMISSION_DENIED],
    ['NOT_FOUND', status.NOT_FOUND],
    ['INTERNAL', status.INTERNAL],
  ] as const)('HandlerError("%s") → %i', async (code, grpcCode) => {
    const handler = vi.fn(async () => {
      throw new HandlerError(code, 'oops');
    });
    const { logger } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_PRINCIPAL_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: grpcCode, details: 'oops' });
  });

  it('unknown errors → INTERNAL with scrubbed message AND logger.error', async () => {
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
    expect((err as Error).message).toBe('internal error');
    const errorCall = calls.find(c => c.level === 'error');
    expect(errorCall?.msg).toContain('unhandled');
  });
});

describe('adaptUnauth (principal-optional) — Login/Refresh/Validate', () => {
  it('invokes the handler with principal=null when metadata is missing', async () => {
    const handler = vi.fn(async (_deps, principal, _req: unknown) => ({
      gotNull: principal === null,
    }));
    const { logger } = makeLogger();
    const wrapped = adaptUnauth(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata({})), callback);
    await new Promise(r => setImmediate(r));

    expect(handler).toHaveBeenCalledTimes(1);
    const [err, res] = vi.mocked(callback).mock.calls[0];
    expect(err).toBeNull();
    expect(res).toEqual({ gotNull: true });
  });

  it('passes the principal through when metadata IS present', async () => {
    const handler = vi.fn(async (_deps, principal, _req: unknown) => ({
      userId: principal?.userId,
    }));
    const { logger } = makeLogger();
    const wrapped = adaptUnauth(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_PRINCIPAL_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err, res] = vi.mocked(callback).mock.calls[0];
    expect(err).toBeNull();
    expect(res).toEqual({ userId: 'usr-1' });
  });

  it('still maps HandlerError codes to gRPC status', async () => {
    const handler = vi.fn(async () => {
      throw new HandlerError('UNAUTHENTICATED', 'invalid credentials');
    });
    const { logger } = makeLogger();
    const wrapped = adaptUnauth(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata({})), callback);
    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({
      code: status.UNAUTHENTICATED,
      details: 'invalid credentials',
    });
  });
});
