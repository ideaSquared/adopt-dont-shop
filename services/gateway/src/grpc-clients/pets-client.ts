// Promise-wrapped client for service.pets.
//
// Phase 3.5 surface — full PetService.{Create, Get, List, Update,
// UpdateStatus, Delete}. The Phase 2.5 authenticate middleware
// already populates the x-user-* metadata for every authenticated
// request, so the routes that consume this client thread the same
// gRPC Metadata pattern as services/gateway/src/grpc-clients/
// auth-client.ts.
//
// The interface is exported so tests can substitute a mock; the
// routes depend on the shape, not the @grpc/grpc-js client.

import { credentials, Metadata, type CallOptions } from '@grpc/grpc-js';

import {
  PetsV1,
  type AddFavoriteRequest,
  type AddFavoriteResponse,
  type CreatePetRequest,
  type CreatePetResponse,
  type DeletePetRequest,
  type DeletePetResponse,
  type GetAdoptionsByTypeRequest,
  type GetAdoptionsByTypeResponse,
  type GetAdoptionTrendRequest,
  type GetAdoptionTrendResponse,
  type GetFavoriteStatusRequest,
  type GetFavoriteStatusResponse,
  type GetPetRequest,
  type GetPetResponse,
  type GetPetStatsRequest,
  type GetPetStatsResponse,
  type GetTopBreedsByAdoptionsRequest,
  type GetTopBreedsByAdoptionsResponse,
  type GetTopRescuesByAdoptionsRequest,
  type GetTopRescuesByAdoptionsResponse,
  type ListPetsRequest,
  type ListPetsResponse,
  type ListUserFavoritesRequest,
  type ListUserFavoritesResponse,
  type RemoveFavoriteRequest,
  type RemoveFavoriteResponse,
  type UpdatePetRequest,
  type UpdatePetResponse,
  type UpdatePetStatusRequest,
  type UpdatePetStatusResponse,
} from '@adopt-dont-shop/proto';

import { startGrpcTimer } from '@adopt-dont-shop/observability';

import { callWithResilience, getOrCreateCircuitBreaker } from './resilience.js';

export type PetsClient = {
  create(req: CreatePetRequest, metadata: Metadata): Promise<CreatePetResponse>;
  get(req: GetPetRequest, metadata: Metadata): Promise<GetPetResponse>;
  list(req: ListPetsRequest, metadata: Metadata): Promise<ListPetsResponse>;
  update(req: UpdatePetRequest, metadata: Metadata): Promise<UpdatePetResponse>;
  updateStatus(req: UpdatePetStatusRequest, metadata: Metadata): Promise<UpdatePetStatusResponse>;
  delete(req: DeletePetRequest, metadata: Metadata): Promise<DeletePetResponse>;
  getStats(req: GetPetStatsRequest, metadata: Metadata): Promise<GetPetStatsResponse>;
  addFavorite(req: AddFavoriteRequest, metadata: Metadata): Promise<AddFavoriteResponse>;
  removeFavorite(req: RemoveFavoriteRequest, metadata: Metadata): Promise<RemoveFavoriteResponse>;
  getFavoriteStatus(
    req: GetFavoriteStatusRequest,
    metadata: Metadata
  ): Promise<GetFavoriteStatusResponse>;
  listUserFavorites(
    req: ListUserFavoritesRequest,
    metadata: Metadata
  ): Promise<ListUserFavoritesResponse>;
  getAdoptionTrend(
    req: GetAdoptionTrendRequest,
    metadata: Metadata
  ): Promise<GetAdoptionTrendResponse>;
  getAdoptionsByType(
    req: GetAdoptionsByTypeRequest,
    metadata: Metadata
  ): Promise<GetAdoptionsByTypeResponse>;
  getTopRescuesByAdoptions(
    req: GetTopRescuesByAdoptionsRequest,
    metadata: Metadata
  ): Promise<GetTopRescuesByAdoptionsResponse>;
  getTopBreedsByAdoptions(
    req: GetTopBreedsByAdoptionsRequest,
    metadata: Metadata
  ): Promise<GetTopBreedsByAdoptionsResponse>;
  close(): void;
};

export type CreatePetsClientOptions = {
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

const SERVICE_NAME = 'service.pets';

export const createPetsClient = (opts: CreatePetsClientOptions): PetsClient => {
  const stub = new PetsV1.PetServiceClient(opts.address, credentials.createInsecure());
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
    // ── Non-idempotent (writes / mutations) ──────────────────────────
    create: (req, metadata) => callUnary(stub.create, req, metadata, false),
    update: (req, metadata) => callUnary(stub.update, req, metadata, false),
    updateStatus: (req, metadata) => callUnary(stub.updateStatus, req, metadata, false),
    delete: (req, metadata) => callUnary(stub.delete, req, metadata, false),
    // ── Idempotent (reads) ───────────────────────────────────────────
    get: (req, metadata) => callUnary(stub.get, req, metadata, true),
    list: (req, metadata) => callUnary(stub.list, req, metadata, true),
    getStats: (req, metadata) => callUnary(stub.getStats, req, metadata, true),
    addFavorite: (req, metadata) => callUnary(stub.addFavorite, req, metadata, false),
    removeFavorite: (req, metadata) => callUnary(stub.removeFavorite, req, metadata, false),
    getFavoriteStatus: (req, metadata) => callUnary(stub.getFavoriteStatus, req, metadata, true),
    listUserFavorites: (req, metadata) => callUnary(stub.listUserFavorites, req, metadata, true),
    getAdoptionTrend: (req, metadata) => callUnary(stub.getAdoptionTrend, req, metadata, true),
    getAdoptionsByType: (req, metadata) => callUnary(stub.getAdoptionsByType, req, metadata, true),
    getTopRescuesByAdoptions: (req, metadata) =>
      callUnary(stub.getTopRescuesByAdoptions, req, metadata, true),
    getTopBreedsByAdoptions: (req, metadata) =>
      callUnary(stub.getTopBreedsByAdoptions, req, metadata, true),
    close: () => stub.close(),
  };
};
