// Promise-wrapped client for service.audit.
//
// Phase 10.5 surface — AuditQueryService.{Query, GetByTarget}. The
// Phase 2.5 authenticate middleware populates x-user-* metadata; the
// service handlers re-check the admin.audit_logs permission as
// defence-in-depth (#915).
//
// The interface is exported so tests can substitute a mock; the
// routes depend on the shape, not the @grpc/grpc-js client.

import { credentials, Metadata, type CallOptions } from '@grpc/grpc-js';

import {
  AuditV1,
  type AuditCreateSavedReportRequest,
  type AuditCreateSavedReportResponse,
  type AuditDeleteSavedReportRequest,
  type AuditDeleteSavedReportResponse,
  type AuditGetByTargetRequest,
  type AuditGetByTargetResponse,
  type AuditGetGdprErasureRequestRequest,
  type AuditGetGdprErasureRequestResponse,
  type AuditGetSavedReportRequest,
  type AuditGetSavedReportResponse,
  type AuditListReportTemplatesRequest,
  type AuditListReportTemplatesResponse,
  type AuditListSavedReportsRequest,
  type AuditListSavedReportsResponse,
  type AuditQueryRequest,
  type AuditQueryResponse,
  type AuditUpdateSavedReportRequest,
  type AuditUpdateSavedReportResponse,
} from '@adopt-dont-shop/proto';

import { startGrpcTimer } from '@adopt-dont-shop/observability';

import { callWithResilience, getOrCreateCircuitBreaker } from './resilience.js';

export type AuditClient = {
  query(req: AuditQueryRequest, metadata: Metadata): Promise<AuditQueryResponse>;
  getByTarget(req: AuditGetByTargetRequest, metadata: Metadata): Promise<AuditGetByTargetResponse>;
  listSavedReports(
    req: AuditListSavedReportsRequest,
    metadata: Metadata
  ): Promise<AuditListSavedReportsResponse>;
  getSavedReport(
    req: AuditGetSavedReportRequest,
    metadata: Metadata
  ): Promise<AuditGetSavedReportResponse>;
  createSavedReport(
    req: AuditCreateSavedReportRequest,
    metadata: Metadata
  ): Promise<AuditCreateSavedReportResponse>;
  updateSavedReport(
    req: AuditUpdateSavedReportRequest,
    metadata: Metadata
  ): Promise<AuditUpdateSavedReportResponse>;
  deleteSavedReport(
    req: AuditDeleteSavedReportRequest,
    metadata: Metadata
  ): Promise<AuditDeleteSavedReportResponse>;
  listReportTemplates(
    req: AuditListReportTemplatesRequest,
    metadata: Metadata
  ): Promise<AuditListReportTemplatesResponse>;
  getGdprErasureRequest(
    req: AuditGetGdprErasureRequestRequest,
    metadata: Metadata
  ): Promise<AuditGetGdprErasureRequestResponse>;
  close(): void;
};

export type CreateAuditClientOptions = {
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

const SERVICE_NAME = 'service.audit';

export const createAuditClient = (opts: CreateAuditClientOptions): AuditClient => {
  const stub = new AuditV1.AuditQueryServiceClient(opts.address, credentials.createInsecure());
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
    // ── Non-idempotent (writes) ──────────────────────────────────────
    createSavedReport: (req, metadata) => callUnary(stub.createSavedReport, req, metadata, false),
    updateSavedReport: (req, metadata) => callUnary(stub.updateSavedReport, req, metadata, false),
    deleteSavedReport: (req, metadata) => callUnary(stub.deleteSavedReport, req, metadata, false),
    // ── Idempotent (reads / queries) ─────────────────────────────────
    query: (req, metadata) => callUnary(stub.query, req, metadata, true),
    getByTarget: (req, metadata) => callUnary(stub.getByTarget, req, metadata, true),
    listSavedReports: (req, metadata) => callUnary(stub.listSavedReports, req, metadata, true),
    getSavedReport: (req, metadata) => callUnary(stub.getSavedReport, req, metadata, true),
    listReportTemplates: (req, metadata) =>
      callUnary(stub.listReportTemplates, req, metadata, true),
    getGdprErasureRequest: (req, metadata) =>
      callUnary(stub.getGdprErasureRequest, req, metadata, true),
    close: () => stub.close(),
  };
};
