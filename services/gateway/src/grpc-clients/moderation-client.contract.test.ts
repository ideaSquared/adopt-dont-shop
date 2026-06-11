// Contract tests for the gateway moderation-client.
//
// Boots a real @grpc/grpc-js Server with
// ModerationV1.ModerationServiceService and verifies:
//   1. Happy-path read: getReport() — typed request arrives, typed
//      response round-trips.
//   2. Happy-path write: fileReport() — request fields arrive and
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
  ModerationV1,
  type FileReportRequest,
  type FileReportResponse,
  type GetReportRequest,
  type GetReportResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createModerationClient } from './moderation-client.js';

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

const makeHandlers = (
  overrides: Partial<ModerationV1.ModerationServiceServer>
): ModerationV1.ModerationServiceServer => ({
  fileReport: unimplemented,
  getReport: unimplemented,
  listReports: unimplemented,
  assignReport: unimplemented,
  resolveReport: unimplemented,
  logModeratorAction: unimplemented,
  listModeratorActions: unimplemented,
  addEvidence: unimplemented,
  issueSanction: unimplemented,
  listUserSanctions: unimplemented,
  appealSanction: unimplemented,
  openSupportTicket: unimplemented,
  getSupportTicket: unimplemented,
  listSupportTickets: unimplemented,
  respondToTicket: unimplemented,
  ...overrides,
});

// ── suite ─────────────────────────────────────────────────────────────

describe('moderation-client — gRPC contract', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = (handlers: ModerationV1.ModerationServiceServer): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.addService(ModerationV1.ModerationServiceService, handlers);
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      });
    });

  // ── 1. Read: getReport ───────────────────────────────────────────

  it('getReport — request reportId arrives and typed response round-trips', async () => {
    const want: GetReportResponse = {
      report: {
        reportId: 'report-001',
        reporterId: 'user-1',
        reportedEntityType: 0,
        reportedEntityId: 'entity-1',
        category: 0,
        severity: 0,
        status: 0,
        title: 'Spam',
        description: 'This is spam',
        metadataJson: '{}',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      transitions: [],
    };

    let receivedReportId = '';

    port = await startServer(
      makeHandlers({
        getReport: (
          call: ServerUnaryCall<GetReportRequest, GetReportResponse>,
          cb: sendUnaryData<GetReportResponse>
        ) => {
          receivedReportId = call.request.reportId;
          cb(null, want);
        },
      })
    );

    const client = createModerationClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.getReport(
        { reportId: 'report-001', includeTransitions: false },
        new Metadata()
      );
      expect(receivedReportId).toBe('report-001');
      expect(result.report?.reportId).toBe('report-001');
      expect(result.report?.title).toBe('Spam');
    } finally {
      client.close();
    }
  });

  // ── 2. Write: fileReport ─────────────────────────────────────────

  it('fileReport — request fields arrive and response round-trips', async () => {
    const want: FileReportResponse = {
      report: {
        reportId: 'report-new',
        reporterId: 'user-2',
        reportedEntityType: 0,
        reportedEntityId: 'pet-1',
        category: 0,
        severity: 0,
        status: 0,
        title: 'Inappropriate',
        description: 'Offensive content',
        metadataJson: '{}',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };

    let capturedTitle = '';
    let capturedEntityId = '';

    port = await startServer(
      makeHandlers({
        fileReport: (
          call: ServerUnaryCall<FileReportRequest, FileReportResponse>,
          cb: sendUnaryData<FileReportResponse>
        ) => {
          capturedTitle = call.request.title;
          capturedEntityId = call.request.reportedEntityId;
          cb(null, want);
        },
      })
    );

    const client = createModerationClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.fileReport(
        {
          reportedEntityType: 0,
          reportedEntityId: 'pet-1',
          category: 0,
          severity: 0,
          title: 'Inappropriate',
          description: 'Offensive content',
        },
        new Metadata()
      );
      expect(capturedTitle).toBe('Inappropriate');
      expect(capturedEntityId).toBe('pet-1');
      expect(result.report?.reportId).toBe('report-new');
    } finally {
      client.close();
    }
  });

  // ── 3. Error contract ────────────────────────────────────────────

  it('getReport — NOT_FOUND from the server surfaces with .code === status.NOT_FOUND', async () => {
    port = await startServer(
      makeHandlers({
        getReport: (
          _call: ServerUnaryCall<GetReportRequest, GetReportResponse>,
          cb: sendUnaryData<GetReportResponse>
        ) => {
          cb(makeServiceError(status.NOT_FOUND, 'report not found'), null);
        },
      })
    );

    const client = createModerationClient({ address: `127.0.0.1:${port}` });
    try {
      await client.getReport({ reportId: 'missing', includeTransitions: false }, new Metadata());
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.NOT_FOUND);
    } finally {
      client.close();
    }
  });
});
