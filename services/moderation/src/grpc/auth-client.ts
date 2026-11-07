// Service-to-service gRPC client for service.auth.
//
// A user_suspended / user_banned moderator action must actually restrict the
// account, and the account lives in the auth schema, which moderation never
// writes. The call is AuthService.ApplyUserSanction, made as a narrowly-scoped
// SERVICE principal that holds ONLY moderation.users.sanction (same pattern as
// services/pets/src/grpc/rescue-client.ts), so moderators need none of the
// broad admin.users.* / admin.security.manage permissions. The human
// moderator travels in actor_user_id and is the audit actor.

import { credentials, status, type CallOptions, Metadata } from '@grpc/grpc-js';

import { MODERATION_USERS_SANCTION } from '@adopt-dont-shop/lib.types';
import { AuthV1 } from '@adopt-dont-shop/proto';
import {
  getDefaultPrincipalSigningKey,
  PRINCIPAL_TOKEN_HEADER,
  signPrincipalToken,
} from '@adopt-dont-shop/service-bootstrap';

export type UserSanction = {
  userId: string;
  kind: 'suspend' | 'ban';
  reason: string;
  // The human moderator, recorded as the audit actor.
  actorUserId: string;
  // RFC 3339; suspend only. Omitted = indefinite.
  expiresAt?: string;
};

export type AuthClient = {
  applyUserSanction(sanction: UserSanction): Promise<void>;
  close(): void;
};

export type CreateAuthClientOptions = {
  address: string;
  // Per-call deadline in milliseconds, so a hung auth service fails fast
  // with DEADLINE_EXCEEDED instead of holding the moderation transaction open.
  deadlineMs?: number;
};

const DEFAULT_DEADLINE_MS = 5_000;

// Service principal: only the sanction permission, nothing else.
const SYSTEM_USER_ID = 'svc-moderation';
const SYSTEM_ROLES = ['admin'];
const SYSTEM_PERMISSIONS = [MODERATION_USERS_SANCTION];

export const createAuthClient = (opts: CreateAuthClientOptions): AuthClient => {
  const stub = new AuthV1.AuthServiceClient(opts.address, credentials.createInsecure());
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;

  // Built per call: the signed x-principal-token carries a short TTL.
  const buildSystemMetadata = (): Metadata => {
    const meta = new Metadata();
    meta.set('x-user-id', SYSTEM_USER_ID);
    meta.set('x-user-roles', SYSTEM_ROLES.join(','));
    meta.set('x-user-permissions', SYSTEM_PERMISSIONS.join(','));
    const signingKey = getDefaultPrincipalSigningKey();
    if (signingKey) {
      meta.set(
        PRINCIPAL_TOKEN_HEADER,
        signPrincipalToken(
          { userId: SYSTEM_USER_ID, roles: SYSTEM_ROLES, permissions: SYSTEM_PERMISSIONS },
          signingKey
        )
      );
    }
    return meta;
  };

  return {
    // No retry: the caller's transaction owns failure handling, and the
    // sanction is applied once or the whole moderation action rolls back.
    applyUserSanction: sanction =>
      new Promise<void>((resolve, reject) => {
        const callOptions: Partial<CallOptions> = {
          deadline: new Date(Date.now() + deadlineMs),
        };
        stub.applyUserSanction(
          {
            userId: sanction.userId,
            kind:
              sanction.kind === 'ban'
                ? AuthV1.UserSanctionKind.USER_SANCTION_KIND_BAN
                : AuthV1.UserSanctionKind.USER_SANCTION_KIND_SUSPEND,
            reason: sanction.reason,
            actorUserId: sanction.actorUserId,
            expiresAt: sanction.expiresAt,
          },
          buildSystemMetadata(),
          callOptions,
          (err: unknown) => (err ? reject(err) : resolve())
        );
      }),
    close: () => stub.close(),
  };
};

// Map a downstream gRPC failure onto the handler error vocabulary so the
// gateway still returns a meaningful HTTP status.
export const grpcStatusToHandlerCode = (
  err: unknown
):
  | 'INVALID_ARGUMENT'
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'UNAVAILABLE'
  | 'INTERNAL' => {
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
    case status.UNAVAILABLE:
      return 'UNAVAILABLE';
    default:
      return 'INTERNAL';
  }
};
