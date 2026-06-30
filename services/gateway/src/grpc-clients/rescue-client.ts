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
  type AcceptInvitationRequest,
  type AcceptInvitationResponse,
  type AddEventAttendeeRequest,
  type AddEventAttendeeResponse,
  type CancelRescueInvitationRequest,
  type CancelRescueInvitationResponse,
  type CheckInAttendeeRequest,
  type CheckInAttendeeResponse,
  type CountRescuesRequest,
  type CountRescuesResponse,
  type CreateApplicationQuestionRequest,
  type CreateApplicationQuestionResponse,
  type CreateEventRequest,
  type CreateEventResponse,
  type CreateFosterPlacementRequest,
  type CreateFosterPlacementResponse,
  type DeleteApplicationQuestionRequest,
  type DeleteApplicationQuestionResponse,
  type DeleteEventRequest,
  type DeleteEventResponse,
  type CreateRescueRequest,
  type CreateRescueResponse,
  type EndFosterPlacementRequest,
  type EndFosterPlacementResponse,
  type GetEventAnalyticsRequest,
  type GetEventAnalyticsResponse,
  type GetEventAttendeesRequest,
  type GetEventAttendeesResponse,
  type GetEventRequest,
  type GetEventResponse,
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
  type ListApplicationQuestionsRequest,
  type ListApplicationQuestionsResponse,
  type ListEventsRequest,
  type ListEventsResponse,
  type ListFosterPlacementsRequest,
  type ListFosterPlacementsResponse,
  type ListRescueInvitationsRequest,
  type ListRescueInvitationsResponse,
  type ListRescuesRequest,
  type ListRescuesResponse,
  type ListStaffMembersRequest,
  type ListStaffMembersResponse,
  type RemoveStaffMemberRequest,
  type RemoveStaffMemberResponse,
  type UpdateEventRequest,
  type UpdateEventResponse,
  type UpdateRescueRequest,
  type UpdateRescueResponse,
  type UpdateRescuePlanRequest,
  type UpdateRescuePlanResponse,
  type GetRescueStatisticsRequest,
  type GetRescueStatisticsResponse,
  type SendRescueEmailRequest,
  type SendRescueEmailResponse,
  type VerifyRescueRequest,
  type VerifyRescueResponse,
} from '@adopt-dont-shop/proto';

import { startGrpcTimer } from '@adopt-dont-shop/observability';

import { callWithResilience, getOrCreateCircuitBreaker } from './resilience.js';

export type RescueClient = {
  create(req: CreateRescueRequest, metadata: Metadata): Promise<CreateRescueResponse>;
  get(req: GetRescueRequest, metadata: Metadata): Promise<GetRescueResponse>;
  list(req: ListRescuesRequest, metadata: Metadata): Promise<ListRescuesResponse>;
  update(req: UpdateRescueRequest, metadata: Metadata): Promise<UpdateRescueResponse>;
  updateRescuePlan(
    req: UpdateRescuePlanRequest,
    metadata: Metadata
  ): Promise<UpdateRescuePlanResponse>;
  getRescueStatistics(
    req: GetRescueStatisticsRequest,
    metadata: Metadata
  ): Promise<GetRescueStatisticsResponse>;
  countRescues(req: CountRescuesRequest, metadata: Metadata): Promise<CountRescuesResponse>;
  sendRescueEmail(
    req: SendRescueEmailRequest,
    metadata: Metadata
  ): Promise<SendRescueEmailResponse>;
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
  removeStaffMember(
    req: RemoveStaffMemberRequest,
    metadata: Metadata
  ): Promise<RemoveStaffMemberResponse>;
  listRescueInvitations(
    req: ListRescueInvitationsRequest,
    metadata: Metadata
  ): Promise<ListRescueInvitationsResponse>;
  cancelRescueInvitation(
    req: CancelRescueInvitationRequest,
    metadata: Metadata
  ): Promise<CancelRescueInvitationResponse>;
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
  acceptInvitation(
    req: AcceptInvitationRequest,
    metadata: Metadata
  ): Promise<AcceptInvitationResponse>;
  listApplicationQuestions(
    req: ListApplicationQuestionsRequest,
    metadata: Metadata
  ): Promise<ListApplicationQuestionsResponse>;
  createApplicationQuestion(
    req: CreateApplicationQuestionRequest,
    metadata: Metadata
  ): Promise<CreateApplicationQuestionResponse>;
  deleteApplicationQuestion(
    req: DeleteApplicationQuestionRequest,
    metadata: Metadata
  ): Promise<DeleteApplicationQuestionResponse>;
  listEvents(req: ListEventsRequest, metadata: Metadata): Promise<ListEventsResponse>;
  getEvent(req: GetEventRequest, metadata: Metadata): Promise<GetEventResponse>;
  createEvent(req: CreateEventRequest, metadata: Metadata): Promise<CreateEventResponse>;
  updateEvent(req: UpdateEventRequest, metadata: Metadata): Promise<UpdateEventResponse>;
  deleteEvent(req: DeleteEventRequest, metadata: Metadata): Promise<DeleteEventResponse>;
  getEventAttendees(
    req: GetEventAttendeesRequest,
    metadata: Metadata
  ): Promise<GetEventAttendeesResponse>;
  addEventAttendee(
    req: AddEventAttendeeRequest,
    metadata: Metadata
  ): Promise<AddEventAttendeeResponse>;
  checkInAttendee(
    req: CheckInAttendeeRequest,
    metadata: Metadata
  ): Promise<CheckInAttendeeResponse>;
  getEventAnalytics(
    req: GetEventAnalyticsRequest,
    metadata: Metadata
  ): Promise<GetEventAnalyticsResponse>;
  close(): void;
};

export type CreateRescueClientOptions = {
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

const SERVICE_NAME = 'service.rescue';

export const createRescueClient = (opts: CreateRescueClientOptions): RescueClient => {
  const stub = new RescueV1.RescueServiceClient(opts.address, credentials.createInsecure());
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
    updateRescuePlan: (req, metadata) => callUnary(stub.updateRescuePlan, req, metadata, false),
    sendRescueEmail: (req, metadata) => callUnary(stub.sendRescueEmail, req, metadata, false),
    verify: (req, metadata) => callUnary(stub.verify, req, metadata, false),
    inviteStaff: (req, metadata) => callUnary(stub.inviteStaff, req, metadata, false),
    removeStaffMember: (req, metadata) => callUnary(stub.removeStaffMember, req, metadata, false),
    cancelRescueInvitation: (req, metadata) =>
      callUnary(stub.cancelRescueInvitation, req, metadata, false),
    createFosterPlacement: (req, metadata) =>
      callUnary(stub.createFosterPlacement, req, metadata, false),
    endFosterPlacement: (req, metadata) => callUnary(stub.endFosterPlacement, req, metadata, false),
    createApplicationQuestion: (req, metadata) =>
      callUnary(stub.createApplicationQuestion, req, metadata, false),
    deleteApplicationQuestion: (req, metadata) =>
      callUnary(stub.deleteApplicationQuestion, req, metadata, false),
    acceptInvitation: (req, metadata) => callUnary(stub.acceptInvitation, req, metadata, false),
    createEvent: (req, metadata) => callUnary(stub.createEvent, req, metadata, false),
    updateEvent: (req, metadata) => callUnary(stub.updateEvent, req, metadata, false),
    deleteEvent: (req, metadata) => callUnary(stub.deleteEvent, req, metadata, false),
    addEventAttendee: (req, metadata) => callUnary(stub.addEventAttendee, req, metadata, false),
    checkInAttendee: (req, metadata) => callUnary(stub.checkInAttendee, req, metadata, false),
    // ── Idempotent (reads) ───────────────────────────────────────────
    get: (req, metadata) => callUnary(stub.get, req, metadata, true),
    list: (req, metadata) => callUnary(stub.list, req, metadata, true),
    getRescueStatistics: (req, metadata) =>
      callUnary(stub.getRescueStatistics, req, metadata, true),
    countRescues: (req, metadata) => callUnary(stub.countRescues, req, metadata, true),
    getMyStaffMembership: (req, metadata) =>
      callUnary(stub.getMyStaffMembership, req, metadata, true),
    listStaffMembers: (req, metadata) => callUnary(stub.listStaffMembers, req, metadata, true),
    listRescueInvitations: (req, metadata) =>
      callUnary(stub.listRescueInvitations, req, metadata, true),
    listFosterPlacements: (req, metadata) =>
      callUnary(stub.listFosterPlacements, req, metadata, true),
    getFosterPlacement: (req, metadata) => callUnary(stub.getFosterPlacement, req, metadata, true),
    getInvitationByToken: (req, metadata) =>
      callUnary(stub.getInvitationByToken, req, metadata, true),
    listApplicationQuestions: (req, metadata) =>
      callUnary(stub.listApplicationQuestions, req, metadata, true),
    listEvents: (req, metadata) => callUnary(stub.listEvents, req, metadata, true),
    getEvent: (req, metadata) => callUnary(stub.getEvent, req, metadata, true),
    getEventAttendees: (req, metadata) => callUnary(stub.getEventAttendees, req, metadata, true),
    getEventAnalytics: (req, metadata) => callUnary(stub.getEventAnalytics, req, metadata, true),
    close: () => stub.close(),
  };
};
