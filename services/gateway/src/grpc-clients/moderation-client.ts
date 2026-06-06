// Promise-wrapped client for service.moderation.
//
// Phase 8.5 surface — all 15 ModerationService RPCs. Same
// Promise-wrapped shape as other grpc-clients (audit / matching /
// rescue / pets / auth).
//
// The interface is exported so tests can substitute a mock; the
// routes depend on the shape, not the @grpc/grpc-js client.

import { credentials, Metadata } from '@grpc/grpc-js';

import {
  ModerationV1,
  type AddEvidenceRequest,
  type AddEvidenceResponse,
  type AppealSanctionRequest,
  type AppealSanctionResponse,
  type AssignReportRequest,
  type AssignReportResponse,
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
  close(): void;
};

export type CreateModerationClientOptions = {
  address: string;
};

export const createModerationClient = (opts: CreateModerationClientOptions): ModerationClient => {
  const stub = new ModerationV1.ModerationServiceClient(opts.address, credentials.createInsecure());

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
    fileReport: (req, metadata) => callUnary(stub.fileReport, req, metadata),
    getReport: (req, metadata) => callUnary(stub.getReport, req, metadata),
    listReports: (req, metadata) => callUnary(stub.listReports, req, metadata),
    assignReport: (req, metadata) => callUnary(stub.assignReport, req, metadata),
    resolveReport: (req, metadata) => callUnary(stub.resolveReport, req, metadata),
    logModeratorAction: (req, metadata) => callUnary(stub.logModeratorAction, req, metadata),
    listModeratorActions: (req, metadata) => callUnary(stub.listModeratorActions, req, metadata),
    addEvidence: (req, metadata) => callUnary(stub.addEvidence, req, metadata),
    issueSanction: (req, metadata) => callUnary(stub.issueSanction, req, metadata),
    listUserSanctions: (req, metadata) => callUnary(stub.listUserSanctions, req, metadata),
    appealSanction: (req, metadata) => callUnary(stub.appealSanction, req, metadata),
    openSupportTicket: (req, metadata) => callUnary(stub.openSupportTicket, req, metadata),
    getSupportTicket: (req, metadata) => callUnary(stub.getSupportTicket, req, metadata),
    listSupportTickets: (req, metadata) => callUnary(stub.listSupportTickets, req, metadata),
    respondToTicket: (req, metadata) => callUnary(stub.respondToTicket, req, metadata),
    close: () => stub.close(),
  };
};
