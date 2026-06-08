// Promise-wrapped client for service.cms.

import { credentials, Metadata } from '@grpc/grpc-js';

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

export const createCmsClient = (opts: CreateCmsClientOptions): CmsClient => {
  const stub = new CmsV1.CmsServiceClient(opts.address, credentials.createInsecure());
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
    listPublicContent: (req, metadata) => callUnary(stub.listPublicContent, req, metadata),
    getPublicContentBySlug: (req, metadata) =>
      callUnary(stub.getPublicContentBySlug, req, metadata),
    listContent: (req, metadata) => callUnary(stub.listContent, req, metadata),
    getContent: (req, metadata) => callUnary(stub.getContent, req, metadata),
    getContentBySlug: (req, metadata) => callUnary(stub.getContentBySlug, req, metadata),
    createContent: (req, metadata) => callUnary(stub.createContent, req, metadata),
    updateContent: (req, metadata) => callUnary(stub.updateContent, req, metadata),
    deleteContent: (req, metadata) => callUnary(stub.deleteContent, req, metadata),
    publishContent: (req, metadata) => callUnary(stub.publishContent, req, metadata),
    unpublishContent: (req, metadata) => callUnary(stub.unpublishContent, req, metadata),
    archiveContent: (req, metadata) => callUnary(stub.archiveContent, req, metadata),
    getVersionHistory: (req, metadata) => callUnary(stub.getVersionHistory, req, metadata),
    restoreVersion: (req, metadata) => callUnary(stub.restoreVersion, req, metadata),
    listMenus: (req, metadata) => callUnary(stub.listMenus, req, metadata),
    getMenu: (req, metadata) => callUnary(stub.getMenu, req, metadata),
    createMenu: (req, metadata) => callUnary(stub.createMenu, req, metadata),
    updateMenu: (req, metadata) => callUnary(stub.updateMenu, req, metadata),
    deleteMenu: (req, metadata) => callUnary(stub.deleteMenu, req, metadata),
    close: () => stub.close(),
  };
};
