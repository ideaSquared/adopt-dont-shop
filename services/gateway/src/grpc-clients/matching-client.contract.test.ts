// Contract tests for the gateway matching-client.
//
// Boots a real @grpc/grpc-js Server with
// MatchingV1.MatchingServiceService and verifies:
//   1. Happy-path read: listSwipeHistory() — typed response round-trips.
//   2. Happy-path write: startSession() — request fields arrive and
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
  MatchingV1,
  type ListSwipeHistoryRequest,
  type ListSwipeHistoryResponse,
  type StartSessionRequest,
  type StartSessionResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createMatchingClient } from './matching-client.js';

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
  overrides: Partial<MatchingV1.MatchingServiceServer>
): MatchingV1.MatchingServiceServer => ({
  startSession: unimplemented,
  endSession: unimplemented,
  recommend: unimplemented,
  recordSwipe: unimplemented,
  searchPets: unimplemented,
  listSwipeHistory: unimplemented,
  getMatchProfile: unimplemented,
  upsertMatchProfile: unimplemented,
  getUserSwipeStats: unimplemented,
  getSessionStats: unimplemented,
  ...overrides,
});

// ── suite ─────────────────────────────────────────────────────────────

describe('matching-client — gRPC contract', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = (handlers: MatchingV1.MatchingServiceServer): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.addService(MatchingV1.MatchingServiceService, handlers);
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      });
    });

  // ── 1. Read: listSwipeHistory ────────────────────────────────────

  it('listSwipeHistory — request arrives and typed response round-trips', async () => {
    const want: ListSwipeHistoryResponse = {
      actions: [],
      nextCursor: '',
    };

    let handlerCalled = false;

    port = await startServer(
      makeHandlers({
        listSwipeHistory: (
          _call: ServerUnaryCall<ListSwipeHistoryRequest, ListSwipeHistoryResponse>,
          cb: sendUnaryData<ListSwipeHistoryResponse>
        ) => {
          handlerCalled = true;
          cb(null, want);
        },
      })
    );

    const client = createMatchingClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.listSwipeHistory({ limit: 20 }, new Metadata());
      expect(handlerCalled).toBe(true);
      expect(result.actions).toEqual([]);
    } finally {
      client.close();
    }
  });

  // ── 2. Write: startSession ───────────────────────────────────────

  it('startSession — request deviceType arrives and response round-trips', async () => {
    const want: StartSessionResponse = {
      session: {
        sessionId: 'session-001',
        startTime: '2024-01-01T00:00:00Z',
        totalSwipes: 0,
        likes: 0,
        passes: 0,
        superLikes: 0,
        filtersJson: '{}',
        deviceType: 1,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      created: true,
    };

    let capturedDeviceType = 0;

    port = await startServer(
      makeHandlers({
        startSession: (
          call: ServerUnaryCall<StartSessionRequest, StartSessionResponse>,
          cb: sendUnaryData<StartSessionResponse>
        ) => {
          capturedDeviceType = call.request.deviceType;
          cb(null, want);
        },
      })
    );

    const client = createMatchingClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.startSession({ deviceType: 1 }, new Metadata());
      expect(capturedDeviceType).toBe(1);
      expect(result.session?.sessionId).toBe('session-001');
      expect(result.created).toBe(true);
    } finally {
      client.close();
    }
  });

  // ── 3. Error contract ────────────────────────────────────────────

  it('startSession — UNAUTHENTICATED from the server surfaces with .code intact', async () => {
    port = await startServer(
      makeHandlers({
        startSession: (
          _call: ServerUnaryCall<StartSessionRequest, StartSessionResponse>,
          cb: sendUnaryData<StartSessionResponse>
        ) => {
          cb(makeServiceError(status.UNAUTHENTICATED, 'unauthenticated'), null);
        },
      })
    );

    const client = createMatchingClient({ address: `127.0.0.1:${port}` });
    try {
      await client.startSession({ deviceType: 1 }, new Metadata());
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.UNAUTHENTICATED);
    } finally {
      client.close();
    }
  });
});
