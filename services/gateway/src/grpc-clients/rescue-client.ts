// Promise-wrapped client for service.rescue.
//
// Phase 4.5 surface — full RescueService.{Create, Get, List, Update,
// Verify, InviteStaff}. The Phase 2.5 authenticate middleware already
// populates the x-user-* metadata for every authenticated request, so
// the routes that consume this client thread the same gRPC Metadata
// pattern as services/gateway/src/grpc-clients/pets-client.ts.
//
// The interface is exported so tests can substitute a mock; the
// routes depend on the shape, not the @grpc/grpc-js client.

import { credentials, Metadata } from '@grpc/grpc-js';

import {
  RescueV1,
  type CreateRescueRequest,
  type CreateRescueResponse,
  type GetRescueRequest,
  type GetRescueResponse,
  type InviteStaffRequest,
  type InviteStaffResponse,
  type ListRescuesRequest,
  type ListRescuesResponse,
  type UpdateRescueRequest,
  type UpdateRescueResponse,
  type VerifyRescueRequest,
  type VerifyRescueResponse,
} from '@adopt-dont-shop/proto';

export type RescueClient = {
  create(req: CreateRescueRequest, metadata: Metadata): Promise<CreateRescueResponse>;
  get(req: GetRescueRequest, metadata: Metadata): Promise<GetRescueResponse>;
  list(req: ListRescuesRequest, metadata: Metadata): Promise<ListRescuesResponse>;
  update(req: UpdateRescueRequest, metadata: Metadata): Promise<UpdateRescueResponse>;
  verify(req: VerifyRescueRequest, metadata: Metadata): Promise<VerifyRescueResponse>;
  inviteStaff(req: InviteStaffRequest, metadata: Metadata): Promise<InviteStaffResponse>;
  close(): void;
};

export type CreateRescueClientOptions = {
  address: string;
};

export const createRescueClient = (opts: CreateRescueClientOptions): RescueClient => {
  const stub = new RescueV1.RescueServiceClient(opts.address, credentials.createInsecure());

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
    create: (req, metadata) => callUnary(stub.create, req, metadata),
    get: (req, metadata) => callUnary(stub.get, req, metadata),
    list: (req, metadata) => callUnary(stub.list, req, metadata),
    update: (req, metadata) => callUnary(stub.update, req, metadata),
    verify: (req, metadata) => callUnary(stub.verify, req, metadata),
    inviteStaff: (req, metadata) => callUnary(stub.inviteStaff, req, metadata),
    close: () => stub.close(),
  };
};
