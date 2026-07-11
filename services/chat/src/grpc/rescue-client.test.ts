// Behaviour tests for the chat → rescue gRPC client (ADS-918):
//   1. A server that never responds → DEADLINE_EXCEEDED within the
//      configured deadline (bounded by time, not just error code).
//   2. A server that fails once with UNAVAILABLE then succeeds →
//      the call resolves and exactly 2 handler invocations occurred.
//   3. A server that always returns PERMISSION_DENIED → no retry,
//      error propagates after exactly 1 attempt.
//   4. The client stamps its scoped SYSTEM principal on every call —
//      x-user-* headers always, plus a verifiable x-principal-token
//      when PRINCIPAL_SIGNING_KEY is configured (ADS-800).
//
// Each test binds a real @grpc/grpc-js Server to 127.0.0.1:0 so there
// are no port conflicts; the server is torn down in afterEach. Direct
// port of services/notifications/src/grpc/auth-client.test.ts.

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
  RescueV1,
  type ListStaffMembersRequest,
  type ListStaffMembersResponse,
} from '@adopt-dont-shop/proto';
import {
  PRINCIPAL_TOKEN_HEADER,
  resetDefaultPrincipalSigningKeyForTests,
  verifyPrincipalToken,
} from '@adopt-dont-shop/service-bootstrap';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createRescueClient } from './rescue-client.js';

// ── helpers ──────────────────────────────────────────────────────────

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

const LIST_REQUEST: ListStaffMembersRequest = { rescueId: 'rsc-1' };

const successResponse: ListStaffMembersResponse = {
  staffMembers: [RescueV1.StaffMember.fromPartial({ userId: 'usr-rescue', rescueId: 'rsc-1' })],
};

// ── test suite ───────────────────────────────────────────────────────

describe('createRescueClient (chat) — deadline + retry behaviour', () => {
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
    server.addService(RescueV1.RescueServiceService, {
      listStaffMembers: (
        _call: ServerUnaryCall<ListStaffMembersRequest, ListStaffMembersResponse>,
        _cb: sendUnaryData<ListStaffMembersResponse>
      ) => {
        // Intentionally never call _cb — simulates a hung server.
      },
    });

    const port = await startServer();
    const client = createRescueClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 200,
      maxRetries: 0, // no retries so the test is fast
    });

    const start = Date.now();
    try {
      await client.listStaffMembers(LIST_REQUEST);
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

    server.addService(RescueV1.RescueServiceService, {
      listStaffMembers: (
        _call: ServerUnaryCall<ListStaffMembersRequest, ListStaffMembersResponse>,
        cb: sendUnaryData<ListStaffMembersResponse>
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
    const client = createRescueClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 2,
    });

    try {
      const result = await client.listStaffMembers(LIST_REQUEST);
      expect(result.staffMembers).toHaveLength(1);
      expect(result.staffMembers[0].userId).toBe('usr-rescue');
      expect(callCount).toBe(2);
    } finally {
      client.close();
    }
  });

  it('does not retry PERMISSION_DENIED and propagates the error after exactly 1 attempt', async () => {
    let callCount = 0;

    server.addService(RescueV1.RescueServiceService, {
      listStaffMembers: (
        _call: ServerUnaryCall<ListStaffMembersRequest, ListStaffMembersResponse>,
        cb: sendUnaryData<ListStaffMembersResponse>
      ) => {
        callCount += 1;
        cb(makeServiceError(status.PERMISSION_DENIED, 'not allowed'), null);
      },
    });

    const port = await startServer();
    const client = createRescueClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 2,
    });

    try {
      await client.listStaffMembers(LIST_REQUEST);
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.PERMISSION_DENIED);
      expect(callCount).toBe(1);
    } finally {
      client.close();
    }
  });
});

describe('createRescueClient — signed system principal (ADS-800)', () => {
  const SIGNING_KEY = 'chat-rescue-client-test-signing-key';
  let server: Server;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    delete process.env.PRINCIPAL_SIGNING_KEY;
    resetDefaultPrincipalSigningKeyForTests();
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startCapturingServer = async (): Promise<{ port: number; captured: Metadata[] }> => {
    const captured: Metadata[] = [];
    server.addService(RescueV1.RescueServiceService, {
      listStaffMembers: (
        call: ServerUnaryCall<ListStaffMembersRequest, ListStaffMembersResponse>,
        cb: sendUnaryData<ListStaffMembersResponse>
      ) => {
        captured.push(call.metadata);
        cb(null, successResponse);
      },
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) =>
        err ? reject(err) : resolve(boundPort)
      );
    });
    return { port, captured };
  };

  it('stamps a verifiable x-principal-token over the system principal when PRINCIPAL_SIGNING_KEY is set', async () => {
    process.env.PRINCIPAL_SIGNING_KEY = SIGNING_KEY;
    resetDefaultPrincipalSigningKeyForTests();

    const { port, captured } = await startCapturingServer();
    const client = createRescueClient({ address: `127.0.0.1:${port}` });
    try {
      await client.listStaffMembers(LIST_REQUEST);
      expect(captured).toHaveLength(1);
      const meta = captured[0];
      // Legacy headers still present for services running without the key.
      expect(meta.get('x-user-id')).toEqual(['svc-chat']);
      expect(meta.get('x-user-roles')).toEqual(['admin']);
      expect(meta.get('x-user-permissions')).toEqual(['staff.read,admin.security.manage']);
      // And the signed token carries the same principal.
      const token = String(meta.get(PRINCIPAL_TOKEN_HEADER)[0]);
      const principal = verifyPrincipalToken(token, SIGNING_KEY);
      expect(principal.userId).toBe('svc-chat');
      expect(principal.roles).toEqual(['admin']);
      expect(principal.permissions).toEqual(['staff.read', 'admin.security.manage']);
    } finally {
      client.close();
    }
  });

  it('does not stamp x-principal-token when no signing key is configured', async () => {
    const { port, captured } = await startCapturingServer();
    const client = createRescueClient({ address: `127.0.0.1:${port}` });
    try {
      await client.listStaffMembers(LIST_REQUEST);
      expect(captured).toHaveLength(1);
      expect(captured[0].get(PRINCIPAL_TOKEN_HEADER)).toHaveLength(0);
      expect(captured[0].get('x-user-id')).toEqual(['svc-chat']);
    } finally {
      client.close();
    }
  });
});
