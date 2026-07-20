// Behaviour tests for the rescue → applications gRPC client (ADS-941):
//   1. A server that never responds → DEADLINE_EXCEEDED within the
//      configured deadline (bounded by time, not just error code).
//   2. A server that fails once with UNAVAILABLE then succeeds →
//      the call resolves and exactly 2 handler invocations occurred.
//   3. A server that always returns PERMISSION_DENIED → no retry,
//      error propagates after exactly 1 attempt.
//   4. Caller-supplied metadata (the forwarded principal) reaches the
//      server unchanged.
//
// Each test binds a real @grpc/grpc-js Server to 127.0.0.1:0 so there
// are no port conflicts; the server is torn down in afterEach. Direct
// port of services/chat/src/grpc/applications-client.test.ts.

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
  ApplicationsV1,
  type CountAdoptedAdoptersRequest,
  type CountAdoptedAdoptersResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApplicationsClient } from './applications-client.js';

// ── helpers ──────────────────────────────────────────────────────────

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

const COUNT_REQUEST: CountAdoptedAdoptersRequest = {
  adopterIds: ['usr-1', 'usr-2'],
  createdAfter: '2026-07-01T10:00:00.000Z',
  createdBefore: '2026-09-29T10:00:00.000Z',
};

const successResponse: CountAdoptedAdoptersResponse = { count: 2 };

// ── test suite ───────────────────────────────────────────────────────

describe('createApplicationsClient (rescue) — deadline + retry behaviour', () => {
  let server: Server;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = async (): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) =>
        err ? reject(err) : resolve(boundPort)
      );
    });

  it('rejects with DEADLINE_EXCEEDED when the server never responds, within the deadline window', async () => {
    server.addService(ApplicationsV1.ApplicationServiceService, {
      countAdoptedAdopters: (
        _call: ServerUnaryCall<CountAdoptedAdoptersRequest, CountAdoptedAdoptersResponse>,
        _cb: sendUnaryData<CountAdoptedAdoptersResponse>
      ) => {
        // Intentionally never call _cb — simulates a hung server.
      },
    });

    const port = await startServer();
    const client = createApplicationsClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 200,
      maxRetries: 0, // no retries so the test is fast
    });

    const start = Date.now();
    try {
      await client.countAdoptedAdopters(COUNT_REQUEST, new Metadata());
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

    server.addService(ApplicationsV1.ApplicationServiceService, {
      countAdoptedAdopters: (
        _call: ServerUnaryCall<CountAdoptedAdoptersRequest, CountAdoptedAdoptersResponse>,
        cb: sendUnaryData<CountAdoptedAdoptersResponse>
      ) => {
        callCount += 1;
        if (callCount === 1) {
          cb(makeServiceError(status.UNAVAILABLE, 'service unavailable'), null);
        } else {
          cb(null, successResponse);
        }
      },
    });

    const port = await startServer();
    const client = createApplicationsClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 2,
    });

    try {
      const result = await client.countAdoptedAdopters(COUNT_REQUEST, new Metadata());
      expect(result.count).toBe(2);
      expect(callCount).toBe(2);
    } finally {
      client.close();
    }
  });

  it('does not retry PERMISSION_DENIED and propagates the error after exactly 1 attempt', async () => {
    let callCount = 0;

    server.addService(ApplicationsV1.ApplicationServiceService, {
      countAdoptedAdopters: (
        _call: ServerUnaryCall<CountAdoptedAdoptersRequest, CountAdoptedAdoptersResponse>,
        cb: sendUnaryData<CountAdoptedAdoptersResponse>
      ) => {
        callCount += 1;
        cb(makeServiceError(status.PERMISSION_DENIED, 'not allowed'), null);
      },
    });

    const port = await startServer();
    const client = createApplicationsClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 2,
    });

    try {
      await client.countAdoptedAdopters(COUNT_REQUEST, new Metadata());
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.PERMISSION_DENIED);
      expect(callCount).toBe(1);
    } finally {
      client.close();
    }
  });

  it('forwards the caller-supplied metadata (the principal) to the server', async () => {
    const captured: Metadata[] = [];

    server.addService(ApplicationsV1.ApplicationServiceService, {
      countAdoptedAdopters: (
        call: ServerUnaryCall<CountAdoptedAdoptersRequest, CountAdoptedAdoptersResponse>,
        cb: sendUnaryData<CountAdoptedAdoptersResponse>
      ) => {
        captured.push(call.metadata);
        cb(null, successResponse);
      },
    });

    const port = await startServer();
    const client = createApplicationsClient({ address: `127.0.0.1:${port}` });

    const metadata = new Metadata();
    metadata.set('x-user-id', 'usr-staff');
    metadata.set('x-user-roles', 'rescue_staff');

    try {
      await client.countAdoptedAdopters(COUNT_REQUEST, metadata);
      expect(captured).toHaveLength(1);
      expect(captured[0].get('x-user-id')).toEqual(['usr-staff']);
      expect(captured[0].get('x-user-roles')).toEqual(['rescue_staff']);
    } finally {
      client.close();
    }
  });
});
