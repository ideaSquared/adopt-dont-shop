// Boot-time validation tests for validateAuthPrincipal.
//
// Three behaviours:
//   1. Auth responds OK (any successful response) → resolves without error.
//   2. Auth returns PERMISSION_DENIED or UNAUTHENTICATED → rejects (crashes
//      boot) because the system principal is misconfigured.
//   3. Auth returns UNAVAILABLE → logs a warning and resolves (auth may
//      still be starting; lazy connections are fine at boot).
//
// Each test binds a real @grpc/grpc-js Server to 127.0.0.1:0 — same
// pattern as auth-client.test.ts.

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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthCohortClient } from './auth-client.js';
import { validateAuthPrincipal } from './validate-auth-principal.js';

// ── helpers ──────────────────────────────────────────────────────────

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

const okResponse: ListUserIdsByCohortResponse = {
  userIds: [],
  total: 0,
  page: 1,
  totalPages: 1,
};

// ── test suite ───────────────────────────────────────────────────────

describe('validateAuthPrincipal — boot-time system principal check', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = (): Promise<number> =>
    new Promise((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      });
    });

  it('resolves when auth accepts the system principal', async () => {
    server.addService(AuthV1.AuthServiceService, {
      listUserIdsByCohort: (
        _call: ServerUnaryCall<ListUserIdsByCohortRequest, ListUserIdsByCohortResponse>,
        cb: sendUnaryData<ListUserIdsByCohortResponse>
      ) => {
        cb(null, okResponse);
      },
    });

    port = await startServer();
    const client = createAuthCohortClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 0,
    });

    const logger = { warn: vi.fn(), error: vi.fn() };
    await expect(validateAuthPrincipal(client, logger)).resolves.toBeUndefined();

    client.close();
  });

  it('rejects when auth returns PERMISSION_DENIED (misconfigured system principal)', async () => {
    server.addService(AuthV1.AuthServiceService, {
      listUserIdsByCohort: (
        _call: ServerUnaryCall<ListUserIdsByCohortRequest, ListUserIdsByCohortResponse>,
        cb: sendUnaryData<ListUserIdsByCohortResponse>
      ) => {
        cb(makeServiceError(status.PERMISSION_DENIED, 'admin.users.broadcast required'), null);
      },
    });

    port = await startServer();
    const client = createAuthCohortClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 0,
    });

    const logger = { warn: vi.fn(), error: vi.fn() };
    await expect(validateAuthPrincipal(client, logger)).rejects.toThrow();
    expect(logger.error).toHaveBeenCalled();

    client.close();
  });

  it('rejects when auth returns UNAUTHENTICATED (misconfigured system principal)', async () => {
    server.addService(AuthV1.AuthServiceService, {
      listUserIdsByCohort: (
        _call: ServerUnaryCall<ListUserIdsByCohortRequest, ListUserIdsByCohortResponse>,
        cb: sendUnaryData<ListUserIdsByCohortResponse>
      ) => {
        cb(makeServiceError(status.UNAUTHENTICATED, 'missing x-user-id'), null);
      },
    });

    port = await startServer();
    const client = createAuthCohortClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 0,
    });

    const logger = { warn: vi.fn(), error: vi.fn() };
    await expect(validateAuthPrincipal(client, logger)).rejects.toThrow();
    expect(logger.error).toHaveBeenCalled();

    client.close();
  });

  it('resolves with a warning when auth returns UNAVAILABLE (auth still starting)', async () => {
    server.addService(AuthV1.AuthServiceService, {
      listUserIdsByCohort: (
        _call: ServerUnaryCall<ListUserIdsByCohortRequest, ListUserIdsByCohortResponse>,
        cb: sendUnaryData<ListUserIdsByCohortResponse>
      ) => {
        cb(makeServiceError(status.UNAVAILABLE, 'service unavailable'), null);
      },
    });

    port = await startServer();
    // Disable retries so UNAVAILABLE surfaces immediately.
    const client = createAuthCohortClient({
      address: `127.0.0.1:${port}`,
      deadlineMs: 2_000,
      maxRetries: 0,
    });

    const logger = { warn: vi.fn(), error: vi.fn() };
    await expect(validateAuthPrincipal(client, logger)).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();

    client.close();
  });
});
