// Service-to-service gRPC client for service.pets.
//
// MatchingService is stateless compute: Recommend + SearchPets read
// candidate pets from the pets vertical over gRPC, then rank / filter
// them. Only PetService.List (candidate set), GetAdoptionStats (the
// similar_adopted_fast label) and GetViewsToday (the views_today label) are
// wrapped — none of them does a single-pet Get.
//
// The interface is exported so the gRPC server boot can inject a real
// client and tests can substitute a stub. Direct port of
// services/applications/src/grpc/pets-client.ts.

import { credentials, status, type CallOptions, type Metadata } from '@grpc/grpc-js';

import {
  PetsV1,
  type GetAdoptionStatsRequest,
  type GetAdoptionStatsResponse,
  type GetViewsTodayRequest,
  type GetViewsTodayResponse,
  type ListPetsRequest,
  type ListPetsResponse,
} from '@adopt-dont-shop/proto';

// Per-call override of the client-wide deadline/retry policy, for optional
// lookups that must fail fast instead of eating the caller's budget.
export type CallBudget = { deadlineMs: number; maxRetries?: number };

export type PetsClient = {
  listPets(req: ListPetsRequest, metadata: Metadata): Promise<ListPetsResponse>;
  getAdoptionStats(
    req: GetAdoptionStatsRequest,
    metadata: Metadata,
    budget?: CallBudget
  ): Promise<GetAdoptionStatsResponse>;
  getViewsToday(
    req: GetViewsTodayRequest,
    metadata: Metadata,
    budget?: CallBudget
  ): Promise<GetViewsTodayResponse>;
  close(): void;
};

export type CreatePetsClientOptions = {
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

export const createPetsClient = (opts: CreatePetsClientOptions): PetsClient => {
  const stub = new PetsV1.PetServiceClient(opts.address, credentials.createInsecure());
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
    metadata: Metadata,
    budget?: CallBudget
  ): Promise<Res> => {
    const callDeadlineMs = budget?.deadlineMs ?? deadlineMs;
    const callMaxRetries = budget?.maxRetries ?? maxRetries;
    const attempt = (remaining: number): Promise<Res> =>
      new Promise<Res>((resolve, reject) => {
        const options: Partial<CallOptions> = {
          deadline: new Date(Date.now() + callDeadlineMs),
        };
        fn.call(stub, req, metadata, options, (err: unknown, res: Res) => {
          if (err) {
            if (remaining > 0 && isRetryableError(err)) {
              const retryIndex = callMaxRetries - remaining + 1;
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

    return attempt(callMaxRetries);
  };

  return {
    listPets: (req, metadata) => callWithRetry(stub.list, req, metadata),
    getAdoptionStats: (req, metadata, budget) =>
      callWithRetry(stub.getAdoptionStats, req, metadata, budget),
    getViewsToday: (req, metadata, budget) =>
      callWithRetry(stub.getViewsToday, req, metadata, budget),
    close: () => stub.close(),
  };
};
