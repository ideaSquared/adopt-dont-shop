import { Metadata, status, type ServerUnaryCall, type sendUnaryData } from '@grpc/grpc-js';
import { describe, expect, it, vi } from 'vitest';

import type { Logger } from 'winston';

import { adapt, adaptUnauth, HandlerError, type HandlerDeps } from './adapter.js';

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
  'x-user-id': 'usr-1',
  'x-user-roles': 'rescue_staff',
  'x-user-permissions': 'pets.read',
};

const deps = { pool: {}, nats: {} } as unknown as HandlerDeps;

function makeCall<Req>(request: Req, metadata: Metadata): ServerUnaryCall<Req, unknown> {
  return {
    request,
    metadata,
    sendMetadata: () => undefined,
  } as unknown as ServerUnaryCall<Req, unknown>;
}

describe('adapt — happy path', () => {
  it('passes the request and extracted principal to the handler', async () => {
    const handler = vi.fn(async (_d, principal, req: { ping: string }) => ({
      pong: req.ping,
      asUser: principal.userId,
    }));
    const { logger } = makeLogger();
    const wrapped = adapt('service.test', handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({ ping: 'hi' }, buildMetadata(VALID_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err, res] = vi.mocked(callback).mock.calls[0];
    expect(err).toBeNull();
    expect(res).toEqual({ pong: 'hi', asUser: 'usr-1' });
  });
});

describe('adapt — error code mapping (canonical CODE_TO_GRPC table)', () => {
  it('UNAUTHENTICATED when principal headers are missing', async () => {
    const handler = vi.fn();
    const { logger } = makeLogger();
    const wrapped = adapt('service.test', handler, { deps, logger });

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
    ['ALREADY_EXISTS', status.ALREADY_EXISTS],
    ['FAILED_PRECONDITION', status.FAILED_PRECONDITION],
    ['INTERNAL', status.INTERNAL],
  ] as const)('HandlerError("%s") → gRPC status %i', async (code, grpcCode) => {
    const handler = vi.fn(async () => {
      throw new HandlerError(code, 'oops');
    });
    const { logger } = makeLogger();
    const wrapped = adapt('service.test', handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: grpcCode, details: 'oops' });
  });

  it('ALREADY_EXISTS maps to gRPC status 6', async () => {
    const handler = vi.fn(async () => {
      throw new HandlerError('ALREADY_EXISTS', 'duplicate slug');
    });
    const { logger } = makeLogger();
    const wrapped = adapt('service.test', handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: 6 }); // status.ALREADY_EXISTS === 6
  });

  it('unknown errors → INTERNAL with scrubbed message AND logger.error', async () => {
    const handler = vi.fn(async () => {
      throw new Error('pg: connection lost');
    });
    const { logger, calls } = makeLogger();
    const wrapped = adapt('service.test', handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: status.INTERNAL, details: 'internal error' });
    expect((err as Error).message).toBe('internal error');
    expect(calls.find(c => c.level === 'error')?.msg).toContain('unhandled');
  });
});

describe('adaptUnauth — principal optional', () => {
  it('passes null principal when no headers present', async () => {
    const handler = vi.fn(async (_d, principal) => ({ principal }));
    const { logger } = makeLogger();
    const wrapped = adaptUnauth('service.test', handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata({})), callback);
    await new Promise(r => setImmediate(r));

    const [err, res] = vi.mocked(callback).mock.calls[0];
    expect(err).toBeNull();
    expect((res as { principal: null }).principal).toBeNull();
  });

  it('passes extracted principal when headers are present', async () => {
    const handler = vi.fn(async (_d, principal) => ({ userId: principal?.userId ?? null }));
    const { logger } = makeLogger();
    const wrapped = adaptUnauth('service.test', handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata(VALID_HEADERS)), callback);
    await new Promise(r => setImmediate(r));

    const [err, res] = vi.mocked(callback).mock.calls[0];
    expect(err).toBeNull();
    expect((res as { userId: string }).userId).toBe('usr-1');
  });

  it('maps HandlerError codes including ALREADY_EXISTS', async () => {
    const handler = vi.fn(async () => {
      throw new HandlerError('ALREADY_EXISTS', 'slug taken');
    });
    const { logger } = makeLogger();
    const wrapped = adaptUnauth('service.test', handler, { deps, logger });

    const callback = vi.fn() as unknown as sendUnaryData<unknown>;
    wrapped(makeCall({}, buildMetadata({})), callback);
    await new Promise(r => setImmediate(r));

    const [err] = vi.mocked(callback).mock.calls[0];
    expect(err).toMatchObject({ code: status.ALREADY_EXISTS });
  });
});
