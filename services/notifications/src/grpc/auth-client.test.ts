// Behaviour tests for the notifications auth-client:
//   1. A server that never responds → DEADLINE_EXCEEDED within the
//      configured deadline (bounded by time, not just error code).
//   2. A server that fails once with UNAVAILABLE then succeeds →
//      the call resolves and exactly 2 handler invocations occurred.
//   3. A server that always returns INVALID_ARGUMENT → no retry,
//      error propagates after exactly 1 attempt.
//
// Each test binds a real @grpc/grpc-js Server to 127.0.0.1:0 so there
// are no port conflicts; the server is torn down in afterEach.
//
// Note: the auth-client stamps system metadata internally, so callers
// don't supply Metadata — this test just verifies that the retry and
// deadline logic fires correctly.

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
  AuthV1,
  type ListUserIdsByCohortRequest,
  type ListUserIdsByCohortResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAuthCohortClient } from './auth-client.js';

// ── helpers ──────────────────────────────────────────────────────────

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

const emptyListRequest: ListUserIdsByCohortRequest = {
  userTypes: [],
  statuses: [],
  page: 1,
  limit: 10,
};

// ── test suite ───────────────────────────────────────────────────────

describe('createAuthCohortClient (notifications) — deadline + retry behaviour', () => {
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
    server.addService(AuthV1.AuthServiceService, {
      listUserIdsByCohort: (
        _call: ServerUnaryCall<ListUserIdsByCohortRequest, ListUserIdsByCohortResponse>,
        _cb: sendUnaryData<ListUserIdsByCohortResponse>
      ) => {
        // Intentionally never call _cb — simulates a hung server.
      },
    });

    port = await startServer();
    const client = createAuthCohortClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 200,
      maxRetries: 0, // no retries so the test is fast
    });

    const start = Date.now();
    try {
      await client.listUserIdsByCohort(emptyListRequest);
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
    const successResponse: ListUserIdsByCohortResponse = {
      userIds: ['user-1'],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    server.addService(AuthV1.AuthServiceService, {
      listUserIdsByCohort: (
        _call: ServerUnaryCall<ListUserIdsByCohortRequest, ListUserIdsByCohortResponse>,
        cb: sendUnaryData<ListUserIdsByCohortResponse>
      ) => {
        callCount += 1;
        if (callCount === 1) {
          cb(makeServiceError(status.UNAVAILABLE, 'service unavailable'), null);
        } else {
          cb(null, successResponse);
        }
      },
    });

    port = await startServer();
    const client = createAuthCohortClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 2,
    });

    try {
      const result = await client.listUserIdsByCohort(emptyListRequest);
      expect(result).toEqual(successResponse);
      expect(callCount).toBe(2);
    } finally {
      client.close();
    }
  });

  it('does not retry INVALID_ARGUMENT and propagates the error after exactly 1 attempt', async () => {
    let callCount = 0;

    server.addService(AuthV1.AuthServiceService, {
      listUserIdsByCohort: (
        _call: ServerUnaryCall<ListUserIdsByCohortRequest, ListUserIdsByCohortResponse>,
        cb: sendUnaryData<ListUserIdsByCohortResponse>
      ) => {
        callCount += 1;
        cb(makeServiceError(status.INVALID_ARGUMENT, 'bad request'), null);
      },
    });

    port = await startServer();
    const client = createAuthCohortClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 2,
    });

    try {
      await client.listUserIdsByCohort(emptyListRequest);
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.INVALID_ARGUMENT);
      expect(callCount).toBe(1);
    } finally {
      client.close();
    }
  });
});
