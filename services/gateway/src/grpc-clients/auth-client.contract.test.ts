// Contract tests for the gateway auth-client.
//
// Each test boots an in-process @grpc/grpc-js Server registering the
// REAL AuthV1.AuthServiceService definition, verifies:
//   1. A happy-path RPC round-trip (validateToken — read path).
//   2. A write-path RPC round-trip (login).
//   3. gRPC error contract: NOT_FOUND on validateToken surfaces with
//      .code === status.NOT_FOUND (the GRPC_TO_HTTP mapping depends on
//      this).
//   4. Deadline assertion (one slow test on auth only — skipped for all
//      other clients to keep the suite fast): a never-responding handler
//      + DEFAULT_DEADLINE_MS=5000 → DEADLINE_EXCEEDED within ~6s.

import {
  Metadata,
  type ServerUnaryCall,
  type sendUnaryData,
  type ServiceError,
  status,
} from '@grpc/grpc-js';

import {
  AuthV1,
  type LoginRequest,
  type LoginResponse,
  type ValidateTokenRequest,
  type ValidateTokenResponse,
} from '@adopt-dont-shop/proto';

import { describe, expect, it } from 'vitest';

import { startStubGrpcServer, type StubGrpcServer } from '@adopt-dont-shop/test-utils';

import { createAuthClient } from './auth-client.js';

// ── helpers ──────────────────────────────────────────────────────────

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

const unimplemented = (_call: unknown, cb: sendUnaryData<unknown>) =>
  cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null);

// Minimal valid handler implementations for the full AuthService surface.
// Handlers not under test return UNIMPLEMENTED so the server definition is
// satisfied without masking bugs in the ones being exercised.
const makeHandlers = (overrides: Partial<AuthV1.AuthServiceServer>): AuthV1.AuthServiceServer => ({
  login: unimplemented,
  logout: unimplemented,
  refreshToken: unimplemented,
  validateToken: unimplemented,
  getMe: unimplemented,
  assignRole: unimplemented,
  register: unimplemented,
  verifyEmail: unimplemented,
  resendVerification: unimplemented,
  forgotPassword: unimplemented,
  resetPassword: unimplemented,
  changePassword: unimplemented,
  updateAccount: unimplemented,
  listSessions: unimplemented,
  revokeSession: unimplemented,
  getPrivacyPreferences: unimplemented,
  updatePrivacyPreferences: unimplemented,
  resetPrivacyPreferences: unimplemented,
  searchUsers: unimplemented,
  adminGetUser: unimplemented,
  adminUpdateUser: unimplemented,
  deactivateUser: unimplemented,
  reactivateUser: unimplemented,
  getUserStatistics: unimplemented,
  getUserPermissions: unimplemented,
  bulkUpdateUsers: unimplemented,
  getFieldPermissionDefaults: unimplemented,
  getFieldPermissionDefaultsForRole: unimplemented,
  listFieldPermissionOverrides: unimplemented,
  listFieldPermissionOverridesForRole: unimplemented,
  upsertFieldPermission: unimplemented,
  bulkUpsertFieldPermissions: unimplemented,
  deleteFieldPermission: unimplemented,
  ...overrides,
});

// Start a stub gRPC server for a single test case; the returned `stub`
// carries `stub.address` and `stub.close()`. Callers are responsible for
// calling `stub.close()` in a `finally` block.
const startTestServer = (handlers: AuthV1.AuthServiceServer): Promise<StubGrpcServer> =>
  startStubGrpcServer(AuthV1.AuthServiceService, handlers);

// ── suite ─────────────────────────────────────────────────────────────

describe('auth-client — gRPC contract', () => {
  // ── 1. Happy-path read: validateToken ────────────────────────────

  it('validateToken — returns typed response round-trip', async () => {
    // Principal uses roles: UserRole[] and permissions: string[]
    const want: ValidateTokenResponse = {
      principal: {
        userId: 'user-123',
        roles: [],
        permissions: [],
      },
      expiresAt: '2026-01-01T00:00:00Z',
    };

    let receivedToken = '';

    const stub = await startTestServer(
      makeHandlers({
        validateToken: (
          call: ServerUnaryCall<ValidateTokenRequest, ValidateTokenResponse>,
          cb: sendUnaryData<ValidateTokenResponse>
        ) => {
          receivedToken = call.request.accessToken;
          cb(null, want);
        },
      })
    );

    const client = createAuthClient({ address: stub.address });
    try {
      const result = await client.validateToken({ accessToken: 'tok-abc' }, new Metadata());
      expect(receivedToken).toBe('tok-abc');
      expect(result.principal?.userId).toBe('user-123');
      expect(result.expiresAt).toBe('2026-01-01T00:00:00Z');
    } finally {
      client.close();
      await stub.close();
    }
  });

  // ── 2. Happy-path write: login ────────────────────────────────────

  it('login — request fields arrive at the server and response round-trips', async () => {
    const want: LoginResponse = {
      user: {
        userId: 'user-456',
        email: 'login@example.com',
        userType: 0,
        status: 0,
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      tokens: {
        accessToken: 'at',
        refreshToken: 'rt',
        accessExpiresAt: '2026-01-01T01:00:00Z',
        refreshExpiresAt: '2026-01-08T00:00:00Z',
      },
      permissions: ['pets.read'],
    };

    let capturedEmail = '';
    let capturedPassword = '';

    const stub = await startTestServer(
      makeHandlers({
        login: (
          call: ServerUnaryCall<LoginRequest, LoginResponse>,
          cb: sendUnaryData<LoginResponse>
        ) => {
          capturedEmail = call.request.email;
          capturedPassword = call.request.password;
          cb(null, want);
        },
      })
    );

    const client = createAuthClient({ address: stub.address });
    try {
      const result = await client.login(
        { email: 'login@example.com', password: 'secret' },
        new Metadata()
      );
      expect(capturedEmail).toBe('login@example.com');
      expect(capturedPassword).toBe('secret');
      expect(result.tokens?.accessToken).toBe('at');
      expect(result.user?.userId).toBe('user-456');
    } finally {
      client.close();
      await stub.close();
    }
  });

  // ── 3. Error contract ────────────────────────────────────────────

  it('validateToken — NOT_FOUND from the server surfaces with .code === status.NOT_FOUND', async () => {
    const stub = await startTestServer(
      makeHandlers({
        validateToken: (
          _call: ServerUnaryCall<ValidateTokenRequest, ValidateTokenResponse>,
          cb: sendUnaryData<ValidateTokenResponse>
        ) => {
          cb(makeServiceError(status.NOT_FOUND, 'token not found'), null);
        },
      })
    );

    const client = createAuthClient({ address: stub.address });
    try {
      await client.validateToken({ accessToken: 'missing' }, new Metadata());
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.NOT_FOUND);
    } finally {
      client.close();
      await stub.close();
    }
  });

  // ── 4. Deadline assertion (single slow test — ~5-6s) ─────────────
  // The gateway clients hardcode DEFAULT_DEADLINE_MS = 5_000. We prove the
  // deadline is actually set by creating a never-responding handler and
  // confirming the call rejects with DEADLINE_EXCEEDED within 7s real time.
  //
  // We use `login` (a non-idempotent RPC) so retries are NOT attempted —
  // this keeps the elapsed time bounded to a single 5s deadline.

  it('deadline — a never-responding server produces DEADLINE_EXCEEDED within ~6s', async () => {
    const stub = await startTestServer(
      makeHandlers({
        login: (
          _call: ServerUnaryCall<LoginRequest, LoginResponse>,
          _cb: sendUnaryData<LoginResponse>
        ) => {
          // Intentionally never respond — simulates a hung downstream.
        },
      })
    );

    const client = createAuthClient({ address: stub.address });
    const start = Date.now();
    try {
      await client.login({ email: 'test@example.com', password: 'secret' }, new Metadata());
      expect.fail('expected rejection');
    } catch (err: unknown) {
      const elapsed = Date.now() - start;
      expect((err as { code?: number }).code).toBe(status.DEADLINE_EXCEEDED);
      // Should fire at or shortly after the 5s deadline. Allow up to 7s
      // for slow CI machines.
      expect(elapsed).toBeGreaterThanOrEqual(4_900);
      expect(elapsed).toBeLessThan(7_000);
    } finally {
      client.close();
      await stub.close();
    }
  }, 8_000); // explicit timeout > 5s deadline
});
