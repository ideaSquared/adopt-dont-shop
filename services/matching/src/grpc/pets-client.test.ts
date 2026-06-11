// Behaviour tests for the matching pets-client:
//   1. A server that never responds → DEADLINE_EXCEEDED within the
//      configured deadline (bounded by time, not just error code).
//   2. A server that fails once with UNAVAILABLE then succeeds →
//      the call resolves and exactly 2 handler invocations occurred.
//   3. A server that always returns INVALID_ARGUMENT → no retry,
//      error propagates after exactly 1 attempt.
//
// Each test binds a real @grpc/grpc-js Server to 127.0.0.1:0 so there
// are no port conflicts; the server is torn down in afterEach.

import {
  Metadata,
  Server,
  ServerCredentials,
  ServerUnaryCall,
  sendUnaryData,
  ServiceError,
  status,
} from '@grpc/grpc-js';

import {
  PetsV1,
  type ListPetsRequest,
  type ListPetsResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createPetsClient } from './pets-client.js';

// ── helpers ──────────────────────────────────────────────────────────

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

const emptyMetadata = new Metadata();
const emptyListRequest: ListPetsRequest = {
  limit: 0,
  statusFilter: 0,
  typeFilter: 0,
  sizeFilter: 0,
};

// ── test suite ───────────────────────────────────────────────────────

describe('createPetsClient (matching) — deadline + retry behaviour', () => {
  let server: Server;
  let port: number;

  beforeEach(async () => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = async (): Promise<number> => {
    const p = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) {
          reject(err);
        } else {
          resolve(boundPort);
        }
      });
    });
    return p;
  };

  it('rejects with DEADLINE_EXCEEDED when the server never responds, within the deadline window', async () => {
    server.addService(PetsV1.PetServiceService, {
      list: (_call: ServerUnaryCall<ListPetsRequest, ListPetsResponse>, _cb: sendUnaryData<ListPetsResponse>) => {
        // Intentionally never call _cb — simulates a hung server.
      },
      // Stub remaining methods to satisfy the service definition.
      create: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      get: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      update: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      updateStatus: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      delete: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      getStats: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
    });

    port = await startServer();
    const client = createPetsClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 200,
      maxRetries: 0, // no retries so the test is fast
    });

    const start = Date.now();
    try {
      await client.listPets(emptyListRequest, emptyMetadata);
      expect.fail('expected rejection');
    } catch (err: unknown) {
      const elapsed = Date.now() - start;
      expect((err as { code?: number }).code).toBe(status.DEADLINE_EXCEEDED);
      // Should finish near the deadline — allow generous upper bound for CI.
      expect(elapsed).toBeLessThan(2_000);
    } finally {
      client.close();
    }
  });

  it('resolves on the second attempt when the first attempt returns UNAVAILABLE', async () => {
    let callCount = 0;
    const successResponse: ListPetsResponse = { pets: [], nextCursor: undefined };

    server.addService(PetsV1.PetServiceService, {
      list: (_call: ServerUnaryCall<ListPetsRequest, ListPetsResponse>, cb: sendUnaryData<ListPetsResponse>) => {
        callCount += 1;
        if (callCount === 1) {
          cb(makeServiceError(status.UNAVAILABLE, 'service unavailable'), null);
        } else {
          cb(null, successResponse);
        }
      },
      create: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      get: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      update: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      updateStatus: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      delete: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      getStats: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
    });

    port = await startServer();
    const client = createPetsClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 2,
    });

    try {
      const result = await client.listPets(emptyListRequest, emptyMetadata);
      expect(result).toEqual(successResponse);
      expect(callCount).toBe(2);
    } finally {
      client.close();
    }
  });

  it('does not retry INVALID_ARGUMENT and propagates the error after exactly 1 attempt', async () => {
    let callCount = 0;

    server.addService(PetsV1.PetServiceService, {
      list: (_call: ServerUnaryCall<ListPetsRequest, ListPetsResponse>, cb: sendUnaryData<ListPetsResponse>) => {
        callCount += 1;
        cb(makeServiceError(status.INVALID_ARGUMENT, 'bad request'), null);
      },
      create: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      get: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      update: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      updateStatus: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      delete: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
      getStats: (_call: unknown, cb: sendUnaryData<unknown>) => cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null),
    });

    port = await startServer();
    const client = createPetsClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 2,
    });

    try {
      await client.listPets(emptyListRequest, emptyMetadata);
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.INVALID_ARGUMENT);
      expect(callCount).toBe(1);
    } finally {
      client.close();
    }
  });
});
