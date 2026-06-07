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

import { credentials, Metadata } from '@grpc/grpc-js';

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

export const createMatchingClient = (opts: CreateMatchingClientOptions): MatchingClient => {
  const stub = new MatchingV1.MatchingServiceClient(opts.address, credentials.createInsecure());

  const callUnary = <Req, Res>(
    fn: (req: Req, metadata: Metadata, cb: (err: unknown, res: Res) => void) => unknown,
    req: Req,
    metadata: Metadata
  ): Promise<Res> =>
    new Promise<Res>((resolve, reject) => {
      fn.call(stub, req, metadata, (err: unknown, res: Res) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });

  return {
    startSession: (req, metadata) => callUnary(stub.startSession, req, metadata),
    endSession: (req, metadata) => callUnary(stub.endSession, req, metadata),
    recordSwipe: (req, metadata) => callUnary(stub.recordSwipe, req, metadata),
    listSwipeHistory: (req, metadata) => callUnary(stub.listSwipeHistory, req, metadata),
    recommend: (req, metadata) => callUnary(stub.recommend, req, metadata),
    searchPets: (req, metadata) => callUnary(stub.searchPets, req, metadata),
    getMatchProfile: (req, metadata) => callUnary(stub.getMatchProfile, req, metadata),
    upsertMatchProfile: (req, metadata) => callUnary(stub.upsertMatchProfile, req, metadata),
    getUserSwipeStats: (req, metadata) => callUnary(stub.getUserSwipeStats, req, metadata),
    getSessionStats: (req, metadata) => callUnary(stub.getSessionStats, req, metadata),
    close: () => stub.close(),
  };
};
