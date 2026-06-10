// Request-id middleware + AsyncLocalStorage accessor.
//
// One Fastify onRequest hook stamps `req.requestId` and the response
// `x-request-id` header. Either the inbound `x-request-id` (the gateway
// usually sets it, downstream services read it off gRPC metadata) or a
// freshly minted UUID. AsyncLocalStorage lets any code reached during a
// request — winston meta, downstream gRPC client metadata — fetch the
// id without threading it through every function signature.
//
// Symmetric to the gRPC adapter side: services/*/src/grpc/adapter.ts
// reads x-request-id off `call.metadata`, runs the handler inside the
// same ALS context, and getRequestId() returns the id for downstream
// log lines + any nested outbound calls.

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

const REQUEST_ID_HEADER = 'x-request-id';

type RequestContext = {
  requestId: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export const getRequestId = (): string | undefined => storage.getStore()?.requestId;

// Run an async function inside a request-id context. Used by the gRPC
// adapter on the receiving side and by anything that needs to seed an
// id manually (background jobs, NATS consumers).
export const runWithRequestId = <T>(requestId: string, fn: () => Promise<T> | T): Promise<T> | T =>
  storage.run({ requestId }, fn);

// Fastify decorations augment the request type with `requestId`.
declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

export const registerRequestId = (app: FastifyInstance): void => {
  app.addHook('onRequest', (req, reply, done) => {
    const inbound = req.headers[REQUEST_ID_HEADER];
    const fromHeader = typeof inbound === 'string' && inbound.length > 0 ? inbound : undefined;
    const requestId = fromHeader ?? randomUUID();
    req.requestId = requestId;
    void reply.header(REQUEST_ID_HEADER, requestId);
    storage.run({ requestId }, () => {
      done();
    });
  });
};

// Exported for tests that need to look up the header name without
// duplicating the string literal.
export const REQUEST_ID_HEADER_NAME = REQUEST_ID_HEADER;
