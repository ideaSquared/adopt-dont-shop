// Contract tests for the gateway audit-client.
//
// Boots a real @grpc/grpc-js Server with
// AuditV1.AuditQueryServiceService and verifies:
//   1. Happy-path read: query() — typed request arrives, typed response
//      round-trips.
//   2. Happy-path read: getByTarget() — request fields arrive and
//      response round-trips.
//   3. Error contract: PERMISSION_DENIED surfaces with .code intact.

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
  AuditV1,
  type AuditCreateReportShareRequest,
  type AuditCreateReportShareResponse,
  type AuditGetByTargetRequest,
  type AuditGetByTargetResponse,
  type AuditQueryRequest,
  type AuditQueryResponse,
  type AuditUpsertReportScheduleRequest,
  type AuditUpsertReportScheduleResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAuditClient } from './audit-client.js';

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
  overrides: Partial<AuditV1.AuditQueryServiceServer>
): AuditV1.AuditQueryServiceServer => ({
  query: unimplemented,
  getByTarget: unimplemented,
  listSavedReports: unimplemented,
  getSavedReport: unimplemented,
  createSavedReport: unimplemented,
  updateSavedReport: unimplemented,
  deleteSavedReport: unimplemented,
  listReportTemplates: unimplemented,
  getGdprErasureRequest: unimplemented,
  upsertReportSchedule: unimplemented,
  createReportShare: unimplemented,
  ...overrides,
});

// ── suite ─────────────────────────────────────────────────────────────

describe('audit-client — gRPC contract', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = (handlers: AuditV1.AuditQueryServiceServer): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.addService(AuditV1.AuditQueryServiceService, handlers);
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      });
    });

  // ── 1. Read: query ───────────────────────────────────────────────

  it('query — request limit arrives and empty events list round-trips', async () => {
    const want: AuditQueryResponse = {
      events: [],
      nextCursor: '',
    };

    let receivedLimit = 0;

    port = await startServer(
      makeHandlers({
        query: (
          call: ServerUnaryCall<AuditQueryRequest, AuditQueryResponse>,
          cb: sendUnaryData<AuditQueryResponse>
        ) => {
          receivedLimit = call.request.limit;
          cb(null, want);
        },
      })
    );

    const client = createAuditClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.query({ limit: 25 }, new Metadata());
      expect(receivedLimit).toBe(25);
      expect(result.events).toEqual([]);
    } finally {
      client.close();
    }
  });

  // ── 2. Read: getByTarget ─────────────────────────────────────────

  it('getByTarget — request aggregateType and aggregateId arrive and response round-trips', async () => {
    const want: AuditGetByTargetResponse = {
      events: [],
      nextCursor: '',
    };

    let capturedAggregateType = '';
    let capturedAggregateId = '';

    port = await startServer(
      makeHandlers({
        getByTarget: (
          call: ServerUnaryCall<AuditGetByTargetRequest, AuditGetByTargetResponse>,
          cb: sendUnaryData<AuditGetByTargetResponse>
        ) => {
          capturedAggregateType = call.request.aggregateType;
          capturedAggregateId = call.request.aggregateId;
          cb(null, want);
        },
      })
    );

    const client = createAuditClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.getByTarget(
        { aggregateType: 'application', aggregateId: 'app-001', limit: 10 },
        new Metadata()
      );
      expect(capturedAggregateType).toBe('application');
      expect(capturedAggregateId).toBe('app-001');
      expect(result.events).toEqual([]);
    } finally {
      client.close();
    }
  });

  // ── 3. Write: upsertReportSchedule ───────────────────────────────

  it('upsertReportSchedule — request savedReportId arrives and response round-trips', async () => {
    const want: AuditUpsertReportScheduleResponse = {
      schedule: {
        scheduleId: 'sched-1',
        savedReportId: 'report-1',
        cron: '0 9 * * 1',
        timezone: 'UTC',
        format: 1,
        recipients: [],
        isEnabled: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    };
    let receivedSavedReportId = '';

    port = await startServer(
      makeHandlers({
        upsertReportSchedule: (
          call: ServerUnaryCall<
            AuditUpsertReportScheduleRequest,
            AuditUpsertReportScheduleResponse
          >,
          cb: sendUnaryData<AuditUpsertReportScheduleResponse>
        ) => {
          receivedSavedReportId = call.request.savedReportId;
          cb(null, want);
        },
      })
    );

    const client = createAuditClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.upsertReportSchedule(
        { savedReportId: 'report-1', cron: '0 9 * * 1', format: 1, recipients: [] },
        new Metadata()
      );
      expect(receivedSavedReportId).toBe('report-1');
      expect(result.schedule?.scheduleId).toBe('sched-1');
    } finally {
      client.close();
    }
  });

  // ── 4. Write: createReportShare ──────────────────────────────────

  it('createReportShare — request savedReportId arrives and response round-trips', async () => {
    const want: AuditCreateReportShareResponse = {
      share: {
        shareId: 'share-1',
        savedReportId: 'report-1',
        shareType: 'token',
        permission: 1,
        createdAt: '2026-01-01T00:00:00Z',
      },
      token: 'plaintext-token',
    };
    let receivedSavedReportId = '';

    port = await startServer(
      makeHandlers({
        createReportShare: (
          call: ServerUnaryCall<AuditCreateReportShareRequest, AuditCreateReportShareResponse>,
          cb: sendUnaryData<AuditCreateReportShareResponse>
        ) => {
          receivedSavedReportId = call.request.savedReportId;
          cb(null, want);
        },
      })
    );

    const client = createAuditClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.createReportShare(
        { savedReportId: 'report-1', permission: 1 },
        new Metadata()
      );
      expect(receivedSavedReportId).toBe('report-1');
      expect(result.token).toBe('plaintext-token');
    } finally {
      client.close();
    }
  });

  // ── 5. Error contract ────────────────────────────────────────────

  it('query — PERMISSION_DENIED from the server surfaces with .code intact', async () => {
    port = await startServer(
      makeHandlers({
        query: (
          _call: ServerUnaryCall<AuditQueryRequest, AuditQueryResponse>,
          cb: sendUnaryData<AuditQueryResponse>
        ) => {
          cb(makeServiceError(status.PERMISSION_DENIED, 'admin required'), null);
        },
      })
    );

    const client = createAuditClient({ address: `127.0.0.1:${port}` });
    try {
      await client.query({ limit: 10 }, new Metadata());
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.PERMISSION_DENIED);
    } finally {
      client.close();
    }
  });
});
