// Promise-wrapped client for service.rescue — the staff-membership +
// rescue-lookup RPCs the rescue.verified / rescue.rejected fan-out needs.
// Mirrors auth-client.ts: signed system-principal metadata (ADS-800),
// retry on UNAVAILABLE / DEADLINE_EXCEEDED, a per-call deadline.

import { credentials, status, type CallOptions, Metadata } from '@grpc/grpc-js';

import {
  RescueV1,
  type GetRescueRequest,
  type GetRescueResponse,
  type ListStaffMembersRequest,
  type ListStaffMembersResponse,
} from '@adopt-dont-shop/proto';
import {
  getDefaultPrincipalSigningKey,
  PRINCIPAL_TOKEN_HEADER,
  signPrincipalToken,
} from '@adopt-dont-shop/service-bootstrap';

export type CreateRescueClientOptions = {
  address: string;
  // System principal metadata. ListStaffMembers gates on `staff.read` AND,
  // for an explicit rescue_id, requires the caller to be a member of that
  // rescue UNLESS they are super_admin — so the system principal carries
  // the super_admin role to look up any rescue's staff. Get gates on
  // `rescues.read`.
  systemUserId?: string;
  systemRoles?: string;
  systemPermissions?: string;
  deadlineMs?: number;
  maxRetries?: number;
};

const DEFAULT_DEADLINE_MS = 5_000;
const DEFAULT_MAX_RETRIES = 2;
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
  const base = baseMs * Math.pow(2, attempt - 1);
  return base * (0.75 + Math.random() * 0.5);
};

// The slice of the rescue stub the fan-out handler consumes: the staff
// user_ids to notify, plus the rescue's name for the notification body.
export type RescueStaffClient = {
  listStaffMembers: (rescueId: string) => Promise<string[]>;
  getRescueName: (rescueId: string) => Promise<string | null>;
  close(): void;
};

export function createRescueClient(opts: CreateRescueClientOptions): RescueStaffClient {
  const stub = new RescueV1.RescueServiceClient(opts.address, credentials.createInsecure());
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

  const systemPrincipal = {
    userId: opts.systemUserId ?? 'svc-notifications',
    // super_admin so ListStaffMembers lets us list ANY rescue's staff (the
    // handler restricts explicit rescue_id to members otherwise).
    roles: splitList(opts.systemRoles ?? 'super_admin'),
    permissions: splitList(opts.systemPermissions ?? 'staff.read,rescues.read'),
  };

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
    listStaffMembers: async (rescueId: string): Promise<string[]> => {
      const res = await callWithRetry<ListStaffMembersRequest, ListStaffMembersResponse>(
        stub.listStaffMembers,
        { rescueId }
      );
      return res.staffMembers.map(member => member.userId);
    },
    getRescueName: async (rescueId: string): Promise<string | null> => {
      const res = await callWithRetry<GetRescueRequest, GetRescueResponse>(stub.get, {
        rescueId,
      });
      return res.rescue?.name ?? null;
    },
    close: () => stub.close(),
  };
}
