// Promise-wrapped client for service.applications.
//
// Phase 5.3d surface — all 12 ApplicationService RPCs. Same
// Promise-wrapped shape as the other grpc-clients (moderation / audit /
// matching / rescue / pets / auth).
//
// The interface is exported so tests can substitute a mock; the routes
// depend on the shape, not the @grpc/grpc-js client.

import { credentials, Metadata, type CallOptions } from '@grpc/grpc-js';

import {
  ApplicationsV1,
  type AddDocumentRequest,
  type AddDocumentResponse,
  type ApproveRequest,
  type ApproveResponse,
  type CompleteHomeVisitRequest,
  type CompleteHomeVisitResponse,
  type GetApplicationRequest,
  type GetApplicationResponse,
  type GetStatsRequest,
  type GetStatsResponse,
  type ListApplicationsRequest,
  type ListApplicationsResponse,
  type ListDocumentsRequest,
  type ListDocumentsResponse,
  type MarkAdoptedRequest,
  type MarkAdoptedResponse,
  type RejectRequest,
  type RejectResponse,
  type RemoveDocumentRequest,
  type RemoveDocumentResponse,
  type SaveDraftAnswersRequest,
  type SaveDraftAnswersResponse,
  type ScheduleHomeVisitRequest,
  type ScheduleHomeVisitResponse,
  type StartDraftRequest,
  type StartDraftResponse,
  type StartReviewRequest,
  type StartReviewResponse,
  type SubmitDraftRequest,
  type SubmitDraftResponse,
  type WithdrawRequest,
  type WithdrawResponse,
} from '@adopt-dont-shop/proto';

import { startGrpcTimer } from '@adopt-dont-shop/observability';

import { callWithResilience, getOrCreateCircuitBreaker } from './resilience.js';

export type ApplicationsClient = {
  startDraft(req: StartDraftRequest, metadata: Metadata): Promise<StartDraftResponse>;
  saveDraftAnswers(
    req: SaveDraftAnswersRequest,
    metadata: Metadata
  ): Promise<SaveDraftAnswersResponse>;
  submitDraft(req: SubmitDraftRequest, metadata: Metadata): Promise<SubmitDraftResponse>;
  startReview(req: StartReviewRequest, metadata: Metadata): Promise<StartReviewResponse>;
  scheduleHomeVisit(
    req: ScheduleHomeVisitRequest,
    metadata: Metadata
  ): Promise<ScheduleHomeVisitResponse>;
  completeHomeVisit(
    req: CompleteHomeVisitRequest,
    metadata: Metadata
  ): Promise<CompleteHomeVisitResponse>;
  approve(req: ApproveRequest, metadata: Metadata): Promise<ApproveResponse>;
  reject(req: RejectRequest, metadata: Metadata): Promise<RejectResponse>;
  withdraw(req: WithdrawRequest, metadata: Metadata): Promise<WithdrawResponse>;
  markAdopted(req: MarkAdoptedRequest, metadata: Metadata): Promise<MarkAdoptedResponse>;
  get(req: GetApplicationRequest, metadata: Metadata): Promise<GetApplicationResponse>;
  list(req: ListApplicationsRequest, metadata: Metadata): Promise<ListApplicationsResponse>;
  getStats(req: GetStatsRequest, metadata: Metadata): Promise<GetStatsResponse>;
  addDocument(req: AddDocumentRequest, metadata: Metadata): Promise<AddDocumentResponse>;
  listDocuments(req: ListDocumentsRequest, metadata: Metadata): Promise<ListDocumentsResponse>;
  removeDocument(req: RemoveDocumentRequest, metadata: Metadata): Promise<RemoveDocumentResponse>;
  close(): void;
};

export type CreateApplicationsClientOptions = {
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

const SERVICE_NAME = 'service.applications';

export const createApplicationsClient = (
  opts: CreateApplicationsClientOptions
): ApplicationsClient => {
  const stub = new ApplicationsV1.ApplicationServiceClient(
    opts.address,
    credentials.createInsecure()
  );
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
    // ── Non-idempotent (writes / state transitions) ──────────────────
    startDraft: (req, metadata) => callUnary(stub.startDraft, req, metadata, false),
    saveDraftAnswers: (req, metadata) => callUnary(stub.saveDraftAnswers, req, metadata, false),
    submitDraft: (req, metadata) => callUnary(stub.submitDraft, req, metadata, false),
    startReview: (req, metadata) => callUnary(stub.startReview, req, metadata, false),
    scheduleHomeVisit: (req, metadata) => callUnary(stub.scheduleHomeVisit, req, metadata, false),
    completeHomeVisit: (req, metadata) => callUnary(stub.completeHomeVisit, req, metadata, false),
    approve: (req, metadata) => callUnary(stub.approve, req, metadata, false),
    reject: (req, metadata) => callUnary(stub.reject, req, metadata, false),
    withdraw: (req, metadata) => callUnary(stub.withdraw, req, metadata, false),
    markAdopted: (req, metadata) => callUnary(stub.markAdopted, req, metadata, false),
    addDocument: (req, metadata) => callUnary(stub.addDocument, req, metadata, false),
    removeDocument: (req, metadata) => callUnary(stub.removeDocument, req, metadata, false),
    // ── Idempotent (reads) ───────────────────────────────────────────
    get: (req, metadata) => callUnary(stub.get, req, metadata, true),
    list: (req, metadata) => callUnary(stub.list, req, metadata, true),
    getStats: (req, metadata) => callUnary(stub.getStats, req, metadata, true),
    listDocuments: (req, metadata) => callUnary(stub.listDocuments, req, metadata, true),
    close: () => stub.close(),
  };
};
