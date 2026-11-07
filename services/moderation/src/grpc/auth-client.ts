// Service-to-service gRPC client for service.auth.
//
// A user_suspended moderator action must actually suspend the account, and
// the account lives in the auth schema, which moderation never writes. The
// handler forwards the acting moderator's principal (signed by
// principalToMetadata) so auth enforces its own permission and elevated-target
// checks. Mirrors services/rescue/src/grpc/pets-client.ts.

import { credentials, status, type CallOptions, type Metadata } from '@grpc/grpc-js';

import { AuthV1 } from '@adopt-dont-shop/proto';

export type AuthClient = {
  suspendUser(userId: string, metadata: Metadata): Promise<void>;
  deactivateUser(userId: string, metadata: Metadata): Promise<void>;
  revokeAllSessions(userId: string, metadata: Metadata): Promise<void>;
  close(): void;
};

export type CreateAuthClientOptions = {
  address: string;
  // Per-call deadline in milliseconds, so a hung auth service fails fast
  // with DEADLINE_EXCEEDED instead of holding the moderation transaction open.
  deadlineMs?: number;
};

const DEFAULT_DEADLINE_MS = 5_000;

export const createAuthClient = (opts: CreateAuthClientOptions): AuthClient => {
  const stub = new AuthV1.AuthServiceClient(opts.address, credentials.createInsecure());
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;

  const options = (): Partial<CallOptions> => ({ deadline: new Date(Date.now() + deadlineMs) });

  return {
    // No retry: the caller's transaction owns failure handling, and a
    // retried suspend after a lost response is harmless but unnecessary.
    suspendUser: (userId, metadata) =>
      new Promise<void>((resolve, reject) => {
        stub.adminUpdateUser(
          {
            userId,
            status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
            userType: AuthV1.UserRole.USER_ROLE_UNSPECIFIED,
            emailVerified: undefined,
            firstName: undefined,
            lastName: undefined,
          },
          metadata,
          options(),
          (err: unknown) => (err ? reject(err) : resolve())
        );
      }),
    // Needs admin.users.deactivate on the forwarded moderator principal.
    deactivateUser: (userId, metadata) =>
      new Promise<void>((resolve, reject) => {
        stub.deactivateUser({ userId, reason: undefined }, metadata, options(), (err: unknown) =>
          err ? reject(err) : resolve()
        );
      }),
    // Needs admin.security.manage on the forwarded moderator principal.
    revokeAllSessions: (userId, metadata) =>
      new Promise<void>((resolve, reject) => {
        stub.adminRevokeAllUserSessions({ userId }, metadata, options(), (err: unknown) =>
          err ? reject(err) : resolve()
        );
      }),
    close: () => stub.close(),
  };
};

// Map a downstream gRPC failure onto the handler error vocabulary so the
// gateway still returns a meaningful HTTP status.
export const grpcStatusToHandlerCode = (
  err: unknown
): 'INVALID_ARGUMENT' | 'UNAUTHENTICATED' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'INTERNAL' => {
  const code = (err as { code?: unknown } | null)?.code;
  switch (code) {
    case status.INVALID_ARGUMENT:
      return 'INVALID_ARGUMENT';
    case status.UNAUTHENTICATED:
      return 'UNAUTHENTICATED';
    case status.PERMISSION_DENIED:
      return 'PERMISSION_DENIED';
    case status.NOT_FOUND:
      return 'NOT_FOUND';
    default:
      return 'INTERNAL';
  }
};
