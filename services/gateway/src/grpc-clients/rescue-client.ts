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

import { credentials, Metadata, type CallOptions } from '@grpc/grpc-js';

import {
  RescueV1,
  type CreateFosterPlacementRequest,
  type CreateFosterPlacementResponse,
  type CreateRescueRequest,
  type CreateRescueResponse,
  type EndFosterPlacementRequest,
  type EndFosterPlacementResponse,
  type GetFosterPlacementRequest,
  type GetFosterPlacementResponse,
  type GetInvitationByTokenRequest,
  type GetInvitationByTokenResponse,
  type GetMyStaffMembershipRequest,
  type GetMyStaffMembershipResponse,
  type GetRescueRequest,
  type GetRescueResponse,
  type InviteStaffRequest,
  type InviteStaffResponse,
  type ListFosterPlacementsRequest,
  type ListFosterPlacementsResponse,
  type ListRescuesRequest,
  type ListRescuesResponse,
  type ListStaffMembersRequest,
  type ListStaffMembersResponse,
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
  getMyStaffMembership(
    req: GetMyStaffMembershipRequest,
    metadata: Metadata
  ): Promise<GetMyStaffMembershipResponse>;
  listStaffMembers(
    req: ListStaffMembersRequest,
    metadata: Metadata
  ): Promise<ListStaffMembersResponse>;
  createFosterPlacement(
    req: CreateFosterPlacementRequest,
    metadata: Metadata
  ): Promise<CreateFosterPlacementResponse>;
  listFosterPlacements(
    req: ListFosterPlacementsRequest,
    metadata: Metadata
  ): Promise<ListFosterPlacementsResponse>;
  getFosterPlacement(
    req: GetFosterPlacementRequest,
    metadata: Metadata
  ): Promise<GetFosterPlacementResponse>;
  endFosterPlacement(
    req: EndFosterPlacementRequest,
    metadata: Metadata
  ): Promise<EndFosterPlacementResponse>;
  getInvitationByToken(
    req: GetInvitationByTokenRequest,
    metadata: Metadata
  ): Promise<GetInvitationByTokenResponse>;
  close(): void;
};

export type CreateRescueClientOptions = {
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

export const createRescueClient = (opts: CreateRescueClientOptions): RescueClient => {
  const stub = new RescueV1.RescueServiceClient(opts.address, credentials.createInsecure());

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
      fn.call(stub, req, metadata, options, (err: unknown, res: Res) => {
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
    getMyStaffMembership: (req, metadata) => callUnary(stub.getMyStaffMembership, req, metadata),
    listStaffMembers: (req, metadata) => callUnary(stub.listStaffMembers, req, metadata),
    createFosterPlacement: (req, metadata) => callUnary(stub.createFosterPlacement, req, metadata),
    listFosterPlacements: (req, metadata) => callUnary(stub.listFosterPlacements, req, metadata),
    getFosterPlacement: (req, metadata) => callUnary(stub.getFosterPlacement, req, metadata),
    endFosterPlacement: (req, metadata) => callUnary(stub.endFosterPlacement, req, metadata),
    getInvitationByToken: (req, metadata) => callUnary(stub.getInvitationByToken, req, metadata),
    close: () => stub.close(),
  };
};
