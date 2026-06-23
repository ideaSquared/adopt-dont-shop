// Promise-wrapped client for service.moderation.
//
// Phase 8.5 surface — all 15 ModerationService RPCs. Same
// Promise-wrapped shape as other grpc-clients (audit / matching /
// rescue / pets / auth).
//
// The interface is exported so tests can substitute a mock; the
// routes depend on the shape, not the @grpc/grpc-js client.

import { credentials, Metadata, type CallOptions } from '@grpc/grpc-js';

import {
  ModerationV1,
  type AcknowledgeSanctionRequest,
  type AcknowledgeSanctionResponse,
  type AddEvidenceRequest,
  type AddEvidenceResponse,
  type AppealSanctionRequest,
  type AppealSanctionResponse,
  type AssignReportRequest,
  type AssignReportResponse,
  type AssignSupportTicketRequest,
  type AssignSupportTicketResponse,
  type FileReportRequest,
  type FileReportResponse,
  type GetReportRequest,
  type GetReportResponse,
  type GetSupportTicketRequest,
  type GetSupportTicketResponse,
  type IssueSanctionRequest,
  type IssueSanctionResponse,
  type ListModeratorActionsRequest,
  type ListModeratorActionsResponse,
  type ListReportsRequest,
  type ListReportsResponse,
  type ListSupportTicketsRequest,
  type ListSupportTicketsResponse,
  type ListUserSanctionsRequest,
  type ListUserSanctionsResponse,
  type LogModeratorActionRequest,
  type LogModeratorActionResponse,
  type OpenSupportTicketRequest,
  type OpenSupportTicketResponse,
  type ResolveReportRequest,
  type ResolveReportResponse,
  type RespondToTicketRequest,
  type RespondToTicketResponse,
} from '@adopt-dont-shop/proto';

import { startGrpcTimer } from '@adopt-dont-shop/observability';

import { callWithResilience, getOrCreateCircuitBreaker } from './resilience.js';

export type ModerationClient = {
  fileReport(req: FileReportRequest, metadata: Metadata): Promise<FileReportResponse>;
  getReport(req: GetReportRequest, metadata: Metadata): Promise<GetReportResponse>;
  listReports(req: ListReportsRequest, metadata: Metadata): Promise<ListReportsResponse>;
  assignReport(req: AssignReportRequest, metadata: Metadata): Promise<AssignReportResponse>;
  resolveReport(req: ResolveReportRequest, metadata: Metadata): Promise<ResolveReportResponse>;
  logModeratorAction(
    req: LogModeratorActionRequest,
    metadata: Metadata
  ): Promise<LogModeratorActionResponse>;
  listModeratorActions(
    req: ListModeratorActionsRequest,
    metadata: Metadata
  ): Promise<ListModeratorActionsResponse>;
  addEvidence(req: AddEvidenceRequest, metadata: Metadata): Promise<AddEvidenceResponse>;
  issueSanction(req: IssueSanctionRequest, metadata: Metadata): Promise<IssueSanctionResponse>;
  listUserSanctions(
    req: ListUserSanctionsRequest,
    metadata: Metadata
  ): Promise<ListUserSanctionsResponse>;
  appealSanction(req: AppealSanctionRequest, metadata: Metadata): Promise<AppealSanctionResponse>;
  acknowledgeSanction(
    req: AcknowledgeSanctionRequest,
    metadata: Metadata
  ): Promise<AcknowledgeSanctionResponse>;
  openSupportTicket(
    req: OpenSupportTicketRequest,
    metadata: Metadata
  ): Promise<OpenSupportTicketResponse>;
  getSupportTicket(
    req: GetSupportTicketRequest,
    metadata: Metadata
  ): Promise<GetSupportTicketResponse>;
  listSupportTickets(
    req: ListSupportTicketsRequest,
    metadata: Metadata
  ): Promise<ListSupportTicketsResponse>;
  respondToTicket(
    req: RespondToTicketRequest,
    metadata: Metadata
  ): Promise<RespondToTicketResponse>;
  assignSupportTicket(
    req: AssignSupportTicketRequest,
    metadata: Metadata
  ): Promise<AssignSupportTicketResponse>;
  close(): void;
};

export type CreateModerationClientOptions = {
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

const SERVICE_NAME = 'service.moderation';

export const createModerationClient = (opts: CreateModerationClientOptions): ModerationClient => {
  const stub = new ModerationV1.ModerationServiceClient(opts.address, credentials.createInsecure());
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
    // ── Non-idempotent (writes / moderation actions) ─────────────────
    fileReport: (req, metadata) => callUnary(stub.fileReport, req, metadata, false),
    assignReport: (req, metadata) => callUnary(stub.assignReport, req, metadata, false),
    resolveReport: (req, metadata) => callUnary(stub.resolveReport, req, metadata, false),
    logModeratorAction: (req, metadata) => callUnary(stub.logModeratorAction, req, metadata, false),
    addEvidence: (req, metadata) => callUnary(stub.addEvidence, req, metadata, false),
    issueSanction: (req, metadata) => callUnary(stub.issueSanction, req, metadata, false),
    appealSanction: (req, metadata) => callUnary(stub.appealSanction, req, metadata, false),
    acknowledgeSanction: (req, metadata) =>
      callUnary(stub.acknowledgeSanction, req, metadata, false),
    openSupportTicket: (req, metadata) => callUnary(stub.openSupportTicket, req, metadata, false),
    respondToTicket: (req, metadata) => callUnary(stub.respondToTicket, req, metadata, false),
    assignSupportTicket: (req, metadata) =>
      callUnary(stub.assignSupportTicket, req, metadata, false),
    // ── Idempotent (reads) ───────────────────────────────────────────
    getReport: (req, metadata) => callUnary(stub.getReport, req, metadata, true),
    listReports: (req, metadata) => callUnary(stub.listReports, req, metadata, true),
    listModeratorActions: (req, metadata) =>
      callUnary(stub.listModeratorActions, req, metadata, true),
    listUserSanctions: (req, metadata) => callUnary(stub.listUserSanctions, req, metadata, true),
    getSupportTicket: (req, metadata) => callUnary(stub.getSupportTicket, req, metadata, true),
    listSupportTickets: (req, metadata) => callUnary(stub.listSupportTickets, req, metadata, true),
    close: () => stub.close(),
  };
};
