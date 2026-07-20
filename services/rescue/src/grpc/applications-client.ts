// Service-to-service gRPC client for service.applications.
//
// getEventAnalytics (ADS-941) is the only RescueService RPC that needs
// this: to compute `adoptionsFromEvent` it resolves an event's
// registrant user ids locally (rescue.event_attendees), then asks
// service.applications how many of those ids have an application that
// reached APPROVED/ADOPTED status within the post-event attribution
// window ("registered → later adopted").
//
// Only CountAdoptedAdopters is wrapped — that's all this vertical
// needs. The interface is exported so the gRPC server boot can inject
// a real client and tests can substitute a stub. Direct port of
// services/rescue/src/grpc/pets-client.ts.

import { credentials, status, type CallOptions, type Metadata } from '@grpc/grpc-js';

import {
  ApplicationsV1,
  type CountAdoptedAdoptersRequest,
  type CountAdoptedAdoptersResponse,
} from '@adopt-dont-shop/proto';

export type ApplicationsClient = {
  countAdoptedAdopters(
    req: CountAdoptedAdoptersRequest,
    metadata: Metadata
  ): Promise<CountAdoptedAdoptersResponse>;
  close(): void;
};

export type CreateApplicationsClientOptions = {
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

export const createApplicationsClient = (
  opts: CreateApplicationsClientOptions
): ApplicationsClient => {
  const stub = new ApplicationsV1.ApplicationServiceClient(
    opts.address,
    credentials.createInsecure()
  );
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
    countAdoptedAdopters: (req, metadata) =>
      callWithRetry(stub.countAdoptedAdopters, req, metadata),
    close: () => stub.close(),
  };
};
