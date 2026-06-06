import { Metadata, status, type ServerUnaryCall, type sendUnaryData } from '@grpc/grpc-js';
import { describe, expect, it, vi } from 'vitest';

import type { Logger } from 'winston';

import { adapt, HandlerError, type HandlerDeps } from './adapter.js';

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

const VALID_HEADERS = {
  'x-user-id': 'mod-1',
  'x-user-roles': 'moderator',
  'x-user-permissions': 'reports.resolve',
};

const deps = { pool: {}, nats: {} } as unknown as HandlerDeps;

function makeCall<Req>(request: Req, metadata: Metadata): ServerUnaryCall<Req, unknown> {
  return { request, metadata } as ServerUnaryCall<Req, unknown>;
}

describe('adapt — happy path', () => {
  it('passes the request and extracted principal to the handler', async () => {
    const handler = vi.fn(async (_d, principal, req: { ping: string }) => ({
      pong: req.ping,
      asUser: principal.userId,
    }));
    const { logger } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({ ping: 'hi' }, buildMetadata(VALID_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err, res] = vi.mocked(callback).mock.calls[0];
    expect(err).toBeNull();
    expect(res).toEqual({ pong: 'hi', asUser: 'mod-1' });
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
      throw new HandlerError(code, `${code} test`);
    });
    const { logger } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: grpcCode });
  });

  it('unknown errors → INTERNAL and log', async () => {
    const handler = vi.fn(async () => {
      throw new Error('boom');
    });
    const { logger, calls } = makeLogger();
    const wrapped = adapt(handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: status.INTERNAL });
    expect(calls.some(c => c.level === 'error')).toBe(true);
  });
});
