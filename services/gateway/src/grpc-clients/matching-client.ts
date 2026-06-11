// Promise-wrapped client for service.matching.
//
// Phase 9.5 surface — 4 of 6 RPCs that have real handlers
// (StartSession, EndSession, RecordSwipe, ListSwipeHistory).
// Recommend + SearchPets return UNIMPLEMENTED from the matching
// gRPC server (see services/matching/src/grpc/server.ts NOT_IMPLEMENTED
// stubs); the client exposes them anyway so the gateway can surface
// the upstream UNIMPLEMENTED as a 501 instead of routing requests
// to URLs that don't exist.
//
// Same Promise-wrapped shape as other grpc-clients (rescue / pets /
// auth / notifications / audit).

import { credentials, Metadata, type CallOptions } from '@grpc/grpc-js';

import {
  MatchingV1,
  type EndSessionRequest,
  type EndSessionResponse,
  type GetMatchProfileRequest,
  type GetMatchProfileResponse,
  type GetSessionStatsRequest,
  type GetSessionStatsResponse,
  type GetUserSwipeStatsRequest,
  type GetUserSwipeStatsResponse,
  type ListSwipeHistoryRequest,
  type ListSwipeHistoryResponse,
  type RecommendRequest,
  type RecommendResponse,
  type RecordSwipeRequest,
  type RecordSwipeResponse,
  type SearchPetsRequest,
  type SearchPetsResponse,
  type StartSessionRequest,
  type StartSessionResponse,
  type UpsertMatchProfileRequest,
  type UpsertMatchProfileResponse,
} from '@adopt-dont-shop/proto';

import { startGrpcTimer } from '@adopt-dont-shop/observability';

import { callWithResilience, getOrCreateCircuitBreaker } from './resilience.js';

export type MatchingClient = {
  startSession(req: StartSessionRequest, metadata: Metadata): Promise<StartSessionResponse>;
  endSession(req: EndSessionRequest, metadata: Metadata): Promise<EndSessionResponse>;
  recordSwipe(req: RecordSwipeRequest, metadata: Metadata): Promise<RecordSwipeResponse>;
  listSwipeHistory(
    req: ListSwipeHistoryRequest,
    metadata: Metadata
  ): Promise<ListSwipeHistoryResponse>;
  recommend(req: RecommendRequest, metadata: Metadata): Promise<RecommendResponse>;
  searchPets(req: SearchPetsRequest, metadata: Metadata): Promise<SearchPetsResponse>;
  getMatchProfile(
    req: GetMatchProfileRequest,
    metadata: Metadata
  ): Promise<GetMatchProfileResponse>;
  upsertMatchProfile(
    req: UpsertMatchProfileRequest,
    metadata: Metadata
  ): Promise<UpsertMatchProfileResponse>;
  getUserSwipeStats(
    req: GetUserSwipeStatsRequest,
    metadata: Metadata
  ): Promise<GetUserSwipeStatsResponse>;
  getSessionStats(
    req: GetSessionStatsRequest,
    metadata: Metadata
  ): Promise<GetSessionStatsResponse>;
  close(): void;
};

export type CreateMatchingClientOptions = {
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

const SERVICE_NAME = 'service.matching';

export const createMatchingClient = (opts: CreateMatchingClientOptions): MatchingClient => {
  const stub = new MatchingV1.MatchingServiceClient(opts.address, credentials.createInsecure());
  const breaker = getOrCreateCircuitBreaker(SERVICE_NAME);

  const callUnary = <Req, Res>(
    fn: (
      req: Req,
      metadata: Metadata,
      options: Partial<CallOptions>,
      cb: (err: unknown, res: Res) => void
    ) => unknown,
    req: Req,
    metadata: Metadata,
    idempotent: boolean
  ): Promise<Res> =>
    callWithResilience<Res>(
      deadline =>
        new Promise<Res>((resolve, reject) => {
          const options: Partial<CallOptions> = { deadline };
          const method = fn.name || 'unknown';
          const stop = startGrpcTimer(SERVICE_NAME, method, 'out');
          fn.call(stub, req, metadata, options, (err: unknown, res: Res) => {
            const code =
              err &&
              typeof err === 'object' &&
              'code' in err &&
              typeof (err as { code?: unknown }).code === 'number'
                ? (err as { code: number }).code
                : err
                  ? 2 // UNKNOWN
                  : 0;
            stop(code);
            if (err) {
              reject(err);
              return;
            }
            resolve(res);
          });
        }),
      {
        service: SERVICE_NAME,
        deadlineMs: DEFAULT_DEADLINE_MS,
        idempotent,
        circuitBreaker: breaker,
      }
    );

  return {
    // ── Non-idempotent (writes / session state) ──────────────────────
    startSession: (req, metadata) => callUnary(stub.startSession, req, metadata, false),
    endSession: (req, metadata) => callUnary(stub.endSession, req, metadata, false),
    recordSwipe: (req, metadata) => callUnary(stub.recordSwipe, req, metadata, false),
    upsertMatchProfile: (req, metadata) => callUnary(stub.upsertMatchProfile, req, metadata, false),
    // ── Idempotent (reads / queries) ─────────────────────────────────
    listSwipeHistory: (req, metadata) => callUnary(stub.listSwipeHistory, req, metadata, true),
    recommend: (req, metadata) => callUnary(stub.recommend, req, metadata, true),
    searchPets: (req, metadata) => callUnary(stub.searchPets, req, metadata, true),
    getMatchProfile: (req, metadata) => callUnary(stub.getMatchProfile, req, metadata, true),
    getUserSwipeStats: (req, metadata) => callUnary(stub.getUserSwipeStats, req, metadata, true),
    getSessionStats: (req, metadata) => callUnary(stub.getSessionStats, req, metadata, true),
    close: () => stub.close(),
  };
};
