// Promise-wrapped client for service.cms.

import { credentials, Metadata, type CallOptions } from '@grpc/grpc-js';

import {
  CmsV1,
  type CmsArchiveContentRequest,
  type CmsArchiveContentResponse,
  type CmsCreateContentRequest,
  type CmsCreateContentResponse,
  type CmsCreateMenuRequest,
  type CmsCreateMenuResponse,
  type CmsDeleteContentRequest,
  type CmsDeleteContentResponse,
  type CmsDeleteMenuRequest,
  type CmsDeleteMenuResponse,
  type CmsGetContentBySlugRequest,
  type CmsGetContentBySlugResponse,
  type CmsGetContentRequest,
  type CmsGetContentResponse,
  type CmsGetMenuRequest,
  type CmsGetMenuResponse,
  type CmsGetPublicContentBySlugRequest,
  type CmsGetPublicContentBySlugResponse,
  type CmsGetVersionHistoryRequest,
  type CmsGetVersionHistoryResponse,
  type CmsListContentRequest,
  type CmsListContentResponse,
  type CmsListMenusRequest,
  type CmsListMenusResponse,
  type CmsListPublicContentRequest,
  type CmsListPublicContentResponse,
  type CmsPublishContentRequest,
  type CmsPublishContentResponse,
  type CmsRestoreVersionRequest,
  type CmsRestoreVersionResponse,
  type CmsUnpublishContentRequest,
  type CmsUnpublishContentResponse,
  type CmsUpdateContentRequest,
  type CmsUpdateContentResponse,
  type CmsUpdateMenuRequest,
  type CmsUpdateMenuResponse,
} from '@adopt-dont-shop/proto';

import { startGrpcTimer } from '@adopt-dont-shop/observability';

import { callWithResilience, getOrCreateCircuitBreaker } from './resilience.js';

export type CmsClient = {
  listPublicContent(
    req: CmsListPublicContentRequest,
    metadata: Metadata
  ): Promise<CmsListPublicContentResponse>;
  getPublicContentBySlug(
    req: CmsGetPublicContentBySlugRequest,
    metadata: Metadata
  ): Promise<CmsGetPublicContentBySlugResponse>;
  listContent(req: CmsListContentRequest, metadata: Metadata): Promise<CmsListContentResponse>;
  getContent(req: CmsGetContentRequest, metadata: Metadata): Promise<CmsGetContentResponse>;
  getContentBySlug(
    req: CmsGetContentBySlugRequest,
    metadata: Metadata
  ): Promise<CmsGetContentBySlugResponse>;
  createContent(
    req: CmsCreateContentRequest,
    metadata: Metadata
  ): Promise<CmsCreateContentResponse>;
  updateContent(
    req: CmsUpdateContentRequest,
    metadata: Metadata
  ): Promise<CmsUpdateContentResponse>;
  deleteContent(
    req: CmsDeleteContentRequest,
    metadata: Metadata
  ): Promise<CmsDeleteContentResponse>;
  publishContent(
    req: CmsPublishContentRequest,
    metadata: Metadata
  ): Promise<CmsPublishContentResponse>;
  unpublishContent(
    req: CmsUnpublishContentRequest,
    metadata: Metadata
  ): Promise<CmsUnpublishContentResponse>;
  archiveContent(
    req: CmsArchiveContentRequest,
    metadata: Metadata
  ): Promise<CmsArchiveContentResponse>;
  getVersionHistory(
    req: CmsGetVersionHistoryRequest,
    metadata: Metadata
  ): Promise<CmsGetVersionHistoryResponse>;
  restoreVersion(
    req: CmsRestoreVersionRequest,
    metadata: Metadata
  ): Promise<CmsRestoreVersionResponse>;
  listMenus(req: CmsListMenusRequest, metadata: Metadata): Promise<CmsListMenusResponse>;
  getMenu(req: CmsGetMenuRequest, metadata: Metadata): Promise<CmsGetMenuResponse>;
  createMenu(req: CmsCreateMenuRequest, metadata: Metadata): Promise<CmsCreateMenuResponse>;
  updateMenu(req: CmsUpdateMenuRequest, metadata: Metadata): Promise<CmsUpdateMenuResponse>;
  deleteMenu(req: CmsDeleteMenuRequest, metadata: Metadata): Promise<CmsDeleteMenuResponse>;
  close(): void;
};

export type CreateCmsClientOptions = {
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

const SERVICE_NAME = 'service.cms';

export const createCmsClient = (opts: CreateCmsClientOptions): CmsClient => {
  const stub = new CmsV1.CmsServiceClient(opts.address, credentials.createInsecure());
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
    createContent: (req, metadata) => callUnary(stub.createContent, req, metadata, false),
    updateContent: (req, metadata) => callUnary(stub.updateContent, req, metadata, false),
    deleteContent: (req, metadata) => callUnary(stub.deleteContent, req, metadata, false),
    publishContent: (req, metadata) => callUnary(stub.publishContent, req, metadata, false),
    unpublishContent: (req, metadata) => callUnary(stub.unpublishContent, req, metadata, false),
    archiveContent: (req, metadata) => callUnary(stub.archiveContent, req, metadata, false),
    restoreVersion: (req, metadata) => callUnary(stub.restoreVersion, req, metadata, false),
    createMenu: (req, metadata) => callUnary(stub.createMenu, req, metadata, false),
    updateMenu: (req, metadata) => callUnary(stub.updateMenu, req, metadata, false),
    deleteMenu: (req, metadata) => callUnary(stub.deleteMenu, req, metadata, false),
    // ── Idempotent (reads) ───────────────────────────────────────────
    listPublicContent: (req, metadata) => callUnary(stub.listPublicContent, req, metadata, true),
    getPublicContentBySlug: (req, metadata) =>
      callUnary(stub.getPublicContentBySlug, req, metadata, true),
    listContent: (req, metadata) => callUnary(stub.listContent, req, metadata, true),
    getContent: (req, metadata) => callUnary(stub.getContent, req, metadata, true),
    getContentBySlug: (req, metadata) => callUnary(stub.getContentBySlug, req, metadata, true),
    getVersionHistory: (req, metadata) => callUnary(stub.getVersionHistory, req, metadata, true),
    listMenus: (req, metadata) => callUnary(stub.listMenus, req, metadata, true),
    getMenu: (req, metadata) => callUnary(stub.getMenu, req, metadata, true),
    close: () => stub.close(),
  };
};
