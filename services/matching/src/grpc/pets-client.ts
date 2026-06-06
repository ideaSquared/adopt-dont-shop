// Service-to-service gRPC client for service.pets.
//
// MatchingService is stateless compute: Recommend + SearchPets read
// candidate pets from the pets vertical over gRPC, then rank / filter
// them. Only PetService.List is wrapped — that's all matching needs
// (both RPCs fetch a candidate set; neither does a single-pet Get).
//
// The interface is exported so the gRPC server boot can inject a real
// client and tests can substitute a stub. Direct port of
// services/applications/src/grpc/pets-client.ts.

import { credentials, type Metadata } from '@grpc/grpc-js';

import { PetsV1, type ListPetsRequest, type ListPetsResponse } from '@adopt-dont-shop/proto';

export type PetsClient = {
  listPets(req: ListPetsRequest, metadata: Metadata): Promise<ListPetsResponse>;
  close(): void;
};

export type CreatePetsClientOptions = {
  address: string;
};

export const createPetsClient = (opts: CreatePetsClientOptions): PetsClient => {
  const stub = new PetsV1.PetServiceClient(opts.address, credentials.createInsecure());

  return {
    listPets: (req, metadata) =>
      new Promise<ListPetsResponse>((resolve, reject) => {
        stub.list(req, metadata, (err: unknown, res: ListPetsResponse) => {
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
