// Service-to-service gRPC client for service.rescue.
//
// ListColleagueProfiles is the second AuthService RPC that needs a
// cross-vertical lookup: auth owns names and emails but not rescue
// membership, so the handler asks RescueService.ListStaffMembers under the
// caller's own principal (which resolves the caller's own rescue) before
// revealing who their colleagues are.
//
// Only ListStaffMembers is wrapped. The interface is exported so the gRPC
// server boot can inject a real client and tests can substitute a stub.
// Same shape as ./applications-client.ts.

import { credentials, status, type CallOptions, type Metadata } from '@grpc/grpc-js';

import {
  RescueV1,
  type ListStaffMembersRequest,
  type ListStaffMembersResponse,
} from '@adopt-dont-shop/proto';

export type RescueClient = {
  listStaffMembers(
    req: ListStaffMembersRequest,
    metadata: Metadata
  ): Promise<ListStaffMembersResponse>;
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

export const createRescueClient = (opts: CreateRescueClientOptions): RescueClient => {
  const stub = new RescueV1.RescueServiceClient(opts.address, credentials.createInsecure());
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

  const callWithRetry = <Req, Res>(
    fn: (
      req: Req,
      metadata: Metadata,
      options: Partial<CallOptions>,
      cb: (err: unknown, res: Res) => void
    ) => unknown,
    req: Req,
    metadata: Metadata
  ): Promise<Res> => {
    const attempt = (remaining: number): Promise<Res> =>
      new Promise<Res>((resolve, reject) => {
        const options: Partial<CallOptions> = {
          deadline: new Date(Date.now() + deadlineMs),
        };
        fn.call(stub, req, metadata, options, (err: unknown, res: Res) => {
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
    listStaffMembers: (req, metadata) => callWithRetry(stub.listStaffMembers, req, metadata),
    close: () => stub.close(),
  };
};
