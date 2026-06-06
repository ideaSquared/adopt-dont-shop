// Promise-wrapped client for service.applications.
//
// Phase 5.3d surface — all 12 ApplicationService RPCs. Same
// Promise-wrapped shape as the other grpc-clients (moderation / audit /
// matching / rescue / pets / auth).
//
// The interface is exported so tests can substitute a mock; the routes
// depend on the shape, not the @grpc/grpc-js client.

import { credentials, Metadata } from '@grpc/grpc-js';

import {
  ApplicationsV1,
  type ApproveRequest,
  type ApproveResponse,
  type CompleteHomeVisitRequest,
  type CompleteHomeVisitResponse,
  type GetApplicationRequest,
  type GetApplicationResponse,
  type ListApplicationsRequest,
  type ListApplicationsResponse,
  type MarkAdoptedRequest,
  type MarkAdoptedResponse,
  type RejectRequest,
  type RejectResponse,
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
  close(): void;
};

export type CreateApplicationsClientOptions = {
  address: string;
};

export const createApplicationsClient = (
  opts: CreateApplicationsClientOptions
): ApplicationsClient => {
  const stub = new ApplicationsV1.ApplicationServiceClient(
    opts.address,
    credentials.createInsecure()
  );

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
    startDraft: (req, metadata) => callUnary(stub.startDraft, req, metadata),
    saveDraftAnswers: (req, metadata) => callUnary(stub.saveDraftAnswers, req, metadata),
    submitDraft: (req, metadata) => callUnary(stub.submitDraft, req, metadata),
    startReview: (req, metadata) => callUnary(stub.startReview, req, metadata),
    scheduleHomeVisit: (req, metadata) => callUnary(stub.scheduleHomeVisit, req, metadata),
    completeHomeVisit: (req, metadata) => callUnary(stub.completeHomeVisit, req, metadata),
    approve: (req, metadata) => callUnary(stub.approve, req, metadata),
    reject: (req, metadata) => callUnary(stub.reject, req, metadata),
    withdraw: (req, metadata) => callUnary(stub.withdraw, req, metadata),
    markAdopted: (req, metadata) => callUnary(stub.markAdopted, req, metadata),
    get: (req, metadata) => callUnary(stub.get, req, metadata),
    list: (req, metadata) => callUnary(stub.list, req, metadata),
    close: () => stub.close(),
  };
};
