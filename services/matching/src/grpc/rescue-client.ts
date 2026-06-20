// Service-to-service gRPC client for service.rescue — GetTopPicks
// resolves each pick's rescue name via RescueService.Get. Mirrors
// services/notifications/src/grpc/rescue-client.ts (signed system
// principal, retry on UNAVAILABLE / DEADLINE_EXCEEDED, a per-call
// deadline), trimmed to just the lookup top-picks needs.

import { credentials, status, type CallOptions, Metadata } from '@grpc/grpc-js';

import { RescueV1, type GetRescueRequest, type GetRescueResponse } from '@adopt-dont-shop/proto';
import {
  getDefaultPrincipalSigningKey,
  PRINCIPAL_TOKEN_HEADER,
  signPrincipalToken,
} from '@adopt-dont-shop/service-bootstrap';

export type CreateRescueClientOptions = {
  address: string;
  // System principal metadata. RescueService.Get gates on `rescues.read`.
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

export type RescueNameClient = {
  getRescueName: (rescueId: string) => Promise<string | null>;
  close(): void;
};

export function createRescueClient(opts: CreateRescueClientOptions): RescueNameClient {
  const stub = new RescueV1.RescueServiceClient(opts.address, credentials.createInsecure());
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

  const systemPrincipal = {
    userId: opts.systemUserId ?? 'svc-matching',
    roles: splitList(opts.systemRoles ?? 'super_admin'),
    permissions: splitList(opts.systemPermissions ?? 'rescues.read'),
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
    getRescueName: async (rescueId: string): Promise<string | null> => {
      const res = await callWithRetry<GetRescueRequest, GetRescueResponse>(stub.get, {
        rescueId,
      });
      return res.rescue?.name ?? null;
    },
    close: () => stub.close(),
  };
}
