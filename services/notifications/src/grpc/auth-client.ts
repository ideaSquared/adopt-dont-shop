// Promise-wrapped client for service.auth — just the cohort RPC the
// broadcast handler needs. Defining it locally (rather than depending on
// the gateway's full AuthClient interface) keeps the notifications
// service decoupled from the gateway and means a slimmer dial table.

import { credentials, status, type CallOptions, Metadata } from '@grpc/grpc-js';

import {
  AuthV1,
  type AdminGetUserRequest,
  type AdminGetUserResponse,
  type ListUserIdsByCohortRequest,
  type ListUserIdsByCohortResponse,
} from '@adopt-dont-shop/proto';
import {
  getDefaultPrincipalSigningKey,
  PRINCIPAL_TOKEN_HEADER,
  signPrincipalToken,
} from '@adopt-dont-shop/service-bootstrap';

import type { AuthCohortClient } from './handlers.js';

export type CreateAuthCohortClientOptions = {
  address: string;
  // System principal metadata — needed because ListUserIdsByCohort gates
  // on admin.users.broadcast. The notifications service runs as
  // `svc-notifications` with the same permission seeded by the auth
  // service. Stamping it here means callers (the broadcast handler)
  // don't need to thread metadata through — they're already gating
  // on admin.notifications.broadcast against the caller's principal.
  systemUserId?: string;
  systemRoles?: string;
  systemPermissions?: string;
  // Per-call deadline in milliseconds. Without one, a hung downstream
  // service would hang this request forever; 5s caps the blast radius
  // and lets the caller fail fast with DEADLINE_EXCEEDED.
  deadlineMs?: number;
  // Maximum additional attempts after the first. Only UNAVAILABLE and
  // DEADLINE_EXCEEDED trigger a retry (both are safe for idempotent
  // reads). Defaults to 2 (i.e. up to 3 total attempts).
  maxRetries?: number;
};

const DEFAULT_DEADLINE_MS = 5_000;
const DEFAULT_MAX_RETRIES = 2;
// Retry-eligible status codes for idempotent reads.
const RETRYABLE_CODES = new Set([status.UNAVAILABLE, status.DEADLINE_EXCEEDED]);

const isRetryableError = (err: unknown): boolean => {
  if (err === null || typeof err !== 'object') {
    return false;
  }
  const code = (err as { code?: unknown }).code;
  return typeof code === 'number' && RETRYABLE_CODES.has(code);
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const splitList = (raw: string): string[] =>
  raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const jitteredBackoff = (attempt: number, baseMs: number): number => {
  // Exponential backoff with ±25% jitter: 100ms, 200ms (base defaults).
  const base = baseMs * Math.pow(2, attempt - 1);
  return base * (0.75 + Math.random() * 0.5);
};

// The email channel adapter resolves a recipient's address by user id.
export type AuthUserClient = {
  adminGetUser: (req: AdminGetUserRequest) => Promise<AdminGetUserResponse>;
};

export function createAuthCohortClient(opts: CreateAuthCohortClientOptions): AuthCohortClient &
  AuthUserClient & {
    close(): void;
  } {
  const stub = new AuthV1.AuthServiceClient(opts.address, credentials.createInsecure());
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

  const systemPrincipal = {
    userId: opts.systemUserId ?? 'svc-notifications',
    roles: splitList(opts.systemRoles ?? 'admin'),
    // admin.users.broadcast → Broadcast cohort expansion;
    // admin.users.read → AdminGetUser, used by the email channel adapter to
    // resolve a recipient's address from their user id.
    permissions: splitList(opts.systemPermissions ?? 'admin.users.broadcast,admin.users.read'),
  };

  // Built per attempt, not once at client creation: the signed
  // x-principal-token (ADS-800) carries a short TTL, so a metadata
  // object minted at boot would expire. When PRINCIPAL_SIGNING_KEY is
  // configured (read via config-secrets, _FILE variant supported) the
  // system principal is signed with the shared helper; the x-user-*
  // headers stay for services still running without the key.
  const buildSystemMetadata = (): Metadata => {
    const meta = new Metadata();
    meta.set('x-user-id', systemPrincipal.userId);
    meta.set('x-user-roles', systemPrincipal.roles.join(','));
    meta.set('x-user-permissions', systemPrincipal.permissions.join(','));
    const signingKey = getDefaultPrincipalSigningKey();
    if (signingKey) {
      meta.set(PRINCIPAL_TOKEN_HEADER, signPrincipalToken(systemPrincipal, signingKey));
    }
    return meta;
  };

  const callWithRetry = <Req, Res>(
    fn: (
      req: Req,
      metadata: Metadata,
      options: Partial<CallOptions>,
      cb: (err: unknown, res: Res) => void
    ) => unknown,
    req: Req
  ): Promise<Res> => {
    const attempt = (remaining: number): Promise<Res> =>
      new Promise<Res>((resolve, reject) => {
        const options: Partial<CallOptions> = {
          deadline: new Date(Date.now() + deadlineMs),
        };
        fn.call(stub, req, buildSystemMetadata(), options, (err: unknown, res: Res) => {
          if (err) {
            if (remaining > 0 && isRetryableError(err)) {
              const retryIndex = maxRetries - remaining + 1;
              sleep(jitteredBackoff(retryIndex, 100))
                .then(() => attempt(remaining - 1))
                .then(resolve, reject);
            } else {
              reject(err);
            }
            return;
          }
          resolve(res);
        });
      });

    return attempt(maxRetries);
  };

  return {
    listUserIdsByCohort: (req: ListUserIdsByCohortRequest): Promise<ListUserIdsByCohortResponse> =>
      callWithRetry(stub.listUserIdsByCohort, req),
    adminGetUser: (req: AdminGetUserRequest): Promise<AdminGetUserResponse> =>
      callWithRetry(stub.adminGetUser, req),
    close: () => stub.close(),
  };
}
