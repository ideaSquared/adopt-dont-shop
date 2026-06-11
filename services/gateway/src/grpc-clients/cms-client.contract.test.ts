// Contract tests for the gateway cms-client.
//
// Boots a real @grpc/grpc-js Server with CmsV1.CmsServiceService and
// verifies:
//   1. Happy-path read: listPublicContent() — typed response round-trips.
//   2. Happy-path write: createContent() — request fields arrive and
//      response round-trips.
//   3. Error contract: NOT_FOUND surfaces with .code intact.

import {
  Metadata,
  Server,
  ServerCredentials,
  type ServerUnaryCall,
  type sendUnaryData,
  type ServiceError,
  status,
} from '@grpc/grpc-js';

import {
  CmsV1,
  type CmsCreateContentRequest,
  type CmsCreateContentResponse,
  type CmsGetContentRequest,
  type CmsGetContentResponse,
  type CmsListPublicContentRequest,
  type CmsListPublicContentResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCmsClient } from './cms-client.js';

// ── helpers ──────────────────────────────────────────────────────────

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

const unimplemented = (_call: unknown, cb: sendUnaryData<unknown>) =>
  cb(makeServiceError(status.UNIMPLEMENTED, 'not used'), null);

const makeHandlers = (overrides: Partial<CmsV1.CmsServiceServer>): CmsV1.CmsServiceServer => ({
  listPublicContent: unimplemented,
  getPublicContentBySlug: unimplemented,
  listContent: unimplemented,
  getContent: unimplemented,
  getContentBySlug: unimplemented,
  createContent: unimplemented,
  updateContent: unimplemented,
  deleteContent: unimplemented,
  publishContent: unimplemented,
  unpublishContent: unimplemented,
  archiveContent: unimplemented,
  getVersionHistory: unimplemented,
  restoreVersion: unimplemented,
  listMenus: unimplemented,
  getMenu: unimplemented,
  createMenu: unimplemented,
  updateMenu: unimplemented,
  deleteMenu: unimplemented,
  ...overrides,
});

// ── suite ─────────────────────────────────────────────────────────────

describe('cms-client — gRPC contract', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = (handlers: CmsV1.CmsServiceServer): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.addService(CmsV1.CmsServiceService, handlers);
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      });
    });

  // ── 1. Read: listPublicContent ───────────────────────────────────

  it('listPublicContent — request arrives and typed response round-trips', async () => {
    const want: CmsListPublicContentResponse = {
      items: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };

    let receivedPage = 0;

    port = await startServer(
      makeHandlers({
        listPublicContent: (
          call: ServerUnaryCall<CmsListPublicContentRequest, CmsListPublicContentResponse>,
          cb: sendUnaryData<CmsListPublicContentResponse>
        ) => {
          receivedPage = call.request.page;
          cb(null, want);
        },
      })
    );

    const client = createCmsClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.listPublicContent({ page: 1, limit: 10 }, new Metadata());
      expect(receivedPage).toBe(1);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    } finally {
      client.close();
    }
  });

  // ── 2. Write: createContent ──────────────────────────────────────

  it('createContent — request fields arrive and response round-trips', async () => {
    const want: CmsCreateContentResponse = {
      content: {
        contentId: 'content-001',
        title: 'About Us',
        slug: 'about-us',
        contentType: 0,
        status: 0,
        content: '<p>Hello</p>',
        metaKeywords: [],
        versionsJson: '[]',
        currentVersion: 1,
        authorId: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };

    let capturedTitle = '';
    let capturedSlug = '';

    port = await startServer(
      makeHandlers({
        createContent: (
          call: ServerUnaryCall<CmsCreateContentRequest, CmsCreateContentResponse>,
          cb: sendUnaryData<CmsCreateContentResponse>
        ) => {
          capturedTitle = call.request.title;
          capturedSlug = call.request.slug;
          cb(null, want);
        },
      })
    );

    const client = createCmsClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.createContent(
        {
          title: 'About Us',
          slug: 'about-us',
          contentType: 0,
          content: '<p>Hello</p>',
          metaKeywords: [],
        },
        new Metadata()
      );
      expect(capturedTitle).toBe('About Us');
      expect(capturedSlug).toBe('about-us');
      expect(result.content?.contentId).toBe('content-001');
    } finally {
      client.close();
    }
  });

  // ── 3. Error contract ────────────────────────────────────────────

  it('getContent — NOT_FOUND from the server surfaces with .code === status.NOT_FOUND', async () => {
    port = await startServer(
      makeHandlers({
        getContent: (
          _call: ServerUnaryCall<CmsGetContentRequest, CmsGetContentResponse>,
          cb: sendUnaryData<CmsGetContentResponse>
        ) => {
          cb(makeServiceError(status.NOT_FOUND, 'content not found'), null);
        },
      })
    );

    const client = createCmsClient({ address: `127.0.0.1:${port}` });
    try {
      await client.getContent({ contentId: 'missing' }, new Metadata());
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.NOT_FOUND);
    } finally {
      client.close();
    }
  });
});
