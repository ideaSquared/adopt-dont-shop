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
  type CreatePetRequest,
  type CreatePetResponse,
  type DeletePetRequest,
  type DeletePetResponse,
  type GetPetRequest,
  type GetPetResponse,
  type GetPetStatsRequest,
  type GetPetStatsResponse,
  type ListPetsRequest,
  type ListPetsResponse,
  type UpdatePetRequest,
  type UpdatePetResponse,
  type UpdatePetStatusRequest,
  type UpdatePetStatusResponse,
} from '@adopt-dont-shop/proto';

import { startGrpcTimer } from '@adopt-dont-shop/observability';

export type PetsClient = {
  create(req: CreatePetRequest, metadata: Metadata): Promise<CreatePetResponse>;
  get(req: GetPetRequest, metadata: Metadata): Promise<GetPetResponse>;
  list(req: ListPetsRequest, metadata: Metadata): Promise<ListPetsResponse>;
  update(req: UpdatePetRequest, metadata: Metadata): Promise<UpdatePetResponse>;
  updateStatus(req: UpdatePetStatusRequest, metadata: Metadata): Promise<UpdatePetStatusResponse>;
  delete(req: DeletePetRequest, metadata: Metadata): Promise<DeletePetResponse>;
  getStats(req: GetPetStatsRequest, metadata: Metadata): Promise<GetPetStatsResponse>;
  close(): void;
};

export type CreatePetsClientOptions = {
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

export const createPetsClient = (opts: CreatePetsClientOptions): PetsClient => {
  const stub = new PetsV1.PetServiceClient(opts.address, credentials.createInsecure());

  const callUnary = <Req, Res>(
    fn: (
      req: Req,
      metadata: Metadata,
      options: Partial<CallOptions>,
      cb: (err: unknown, res: Res) => void
    ) => unknown,
    req: Req,
    metadata: Metadata
  ): Promise<Res> =>
    new Promise<Res>((resolve, reject) => {
      const options: Partial<CallOptions> = {
        deadline: new Date(Date.now() + DEFAULT_DEADLINE_MS),
      };
      const method = fn.name || 'unknown';
      const stop = startGrpcTimer('service.pets', method, 'out');
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
    });

  return {
    create: (req, metadata) => callUnary(stub.create, req, metadata),
    get: (req, metadata) => callUnary(stub.get, req, metadata),
    list: (req, metadata) => callUnary(stub.list, req, metadata),
    update: (req, metadata) => callUnary(stub.update, req, metadata),
    updateStatus: (req, metadata) => callUnary(stub.updateStatus, req, metadata),
    delete: (req, metadata) => callUnary(stub.delete, req, metadata),
    getStats: (req, metadata) => callUnary(stub.getStats, req, metadata),
    close: () => stub.close(),
  };
};
