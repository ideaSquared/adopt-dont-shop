// Service-to-service gRPC client for service.pets.
//
// StartDraft is the only ApplicationService RPC that needs a cross-
// vertical lookup: the pure domain requires the rescue that owns the
// pet, but StartDraftRequest only carries pet_id (the SPA doesn't know
// the rescue). So the handler resolves pet → rescue via PetService.Get
// before commanding the domain — the cross-schema FK we can't enforce
// in the database, enforced here at the application layer instead.
//
// Only the Get RPC is wrapped — that's all this vertical needs from
// pets. The interface is exported so the gRPC server boot can inject a
// real client and tests can substitute a stub.

import { credentials, type Metadata } from '@grpc/grpc-js';

import { PetsV1, type GetPetRequest, type GetPetResponse } from '@adopt-dont-shop/proto';

export type PetsClient = {
  getPet(req: GetPetRequest, metadata: Metadata): Promise<GetPetResponse>;
  close(): void;
};

export type CreatePetsClientOptions = {
  address: string;
};

export const createPetsClient = (opts: CreatePetsClientOptions): PetsClient => {
  const stub = new PetsV1.PetServiceClient(opts.address, credentials.createInsecure());

  return {
    getPet: (req, metadata) =>
      new Promise<GetPetResponse>((resolve, reject) => {
        stub.get(req, metadata, (err: unknown, res: GetPetResponse) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(res);
        });
      }),
    close: () => stub.close(),
  };
};
