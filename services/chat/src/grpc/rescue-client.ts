// Service-to-service gRPC client for service.rescue.
//
// OpenChat (ADS-918) needs to confirm that the user an adopter wants to
// chat with is actually a staff member of the rescue that owns the
// resolved application — otherwise an adopter could pass any user_id as
// otherUserId and get an unsolicited DM through. That check
// (RescueService.ListStaffMembers) is itself gated on `staff.read` +
// same-rescue membership, which the calling adopter never holds, so this
// client stamps a narrowly-scoped SYSTEM principal (same pattern as
// services/notifications/src/grpc/auth-client.ts) rather than forwarding
// the caller's own principal.

import { credentials, status, type CallOptions, Metadata } from '@grpc/grpc-js';

import {
  RescueV1,
  type ListStaffMembersRequest,
  type ListStaffMembersResponse,
} from '@adopt-dont-shop/proto';
import {
  getDefaultPrincipalSigningKey,
  PRINCIPAL_TOKEN_HEADER,
  signPrincipalToken,
} from '@adopt-dont-shop/service-bootstrap';

export type RescueClient = {
  listStaffMembers(req: ListStaffMembersRequest): Promise<ListStaffMembersResponse>;
  close(): void;
};

export type CreateRescueClientOptions = {
  address: string;
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

const jitteredBackoff = (attempt: number, baseMs: number): number => {
  // Exponential backoff with ±25% jitter: 100ms, 200ms (base defaults).
  const base = baseMs * Math.pow(2, attempt - 1);
  return base * (0.75 + Math.random() * 0.5);
};

// System principal used ONLY for the ListStaffMembers cross-rescue lookup
// below. `staff.read` clears listStaffMembers' base permission gate;
// `admin.security.manage` clears its own-rescue-membership check so an
// explicit rescue_id (any rescue, not just the caller's) is honoured —
// see services/rescue/src/grpc/staff-foster-handlers.ts listStaffMembers.
const SYSTEM_USER_ID = 'svc-chat';
const SYSTEM_ROLES = ['admin'];
const SYSTEM_PERMISSIONS = ['staff.read', 'admin.security.manage'];

export const createRescueClient = (opts: CreateRescueClientOptions): RescueClient => {
  const stub = new RescueV1.RescueServiceClient(opts.address, credentials.createInsecure());
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

  // Built per attempt, not once at client creation: the signed
  // x-principal-token (ADS-800) carries a short TTL.
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
    listStaffMembers: req => callWithRetry(stub.listStaffMembers, req),
    close: () => stub.close(),
  };
};
