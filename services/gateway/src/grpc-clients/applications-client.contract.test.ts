// Contract tests for the gateway applications-client.
//
// Boots a real @grpc/grpc-js Server with
// ApplicationsV1.ApplicationServiceService and verifies:
//   1. Happy-path read: get() — typed request arrives, typed response
//      round-trips.
//   2. Happy-path write: startDraft() — request fields arrive and
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
  ApplicationsV1,
  type GetApplicationRequest,
  type GetApplicationResponse,
  type StartDraftRequest,
  type StartDraftResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApplicationsClient } from './applications-client.js';

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
  overrides: Partial<ApplicationsV1.ApplicationServiceServer>
): ApplicationsV1.ApplicationServiceServer => ({
  startDraft: unimplemented,
  saveDraftAnswers: unimplemented,
  submitDraft: unimplemented,
  startReview: unimplemented,
  scheduleHomeVisit: unimplemented,
  completeHomeVisit: unimplemented,
  approve: unimplemented,
  reject: unimplemented,
  withdraw: unimplemented,
  markAdopted: unimplemented,
  get: unimplemented,
  list: unimplemented,
  getStats: unimplemented,
  countAdoptedAdopters: unimplemented,
  addDocument: unimplemented,
  listDocuments: unimplemented,
  removeDocument: unimplemented,
  getApplicationDefaults: unimplemented,
  updateApplicationDefaults: unimplemented,
  getApplicationDraft: unimplemented,
  saveApplicationDraft: unimplemented,
  deleteApplicationDraft: unimplemented,
  ...overrides,
});

// ── suite ─────────────────────────────────────────────────────────────

describe('applications-client — gRPC contract', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = (handlers: ApplicationsV1.ApplicationServiceServer): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.addService(ApplicationsV1.ApplicationServiceService, handlers);
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      });
    });

  // ── 1. Read: get ─────────────────────────────────────────────────

  it('get — request applicationId arrives and typed response round-trips', async () => {
    const want: GetApplicationResponse = {
      application: {
        applicationId: 'app-001',
        adopterId: 'adopter-1',
        petId: 'pet-1',
        rescueId: 'rescue-1',
        status: 0,
        answersJson: '{}',
        referencesJson: '[]',
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      timeline: [],
    };

    let receivedApplicationId = '';

    port = await startServer(
      makeHandlers({
        get: (
          call: ServerUnaryCall<GetApplicationRequest, GetApplicationResponse>,
          cb: sendUnaryData<GetApplicationResponse>
        ) => {
          receivedApplicationId = call.request.applicationId;
          cb(null, want);
        },
      })
    );

    const client = createApplicationsClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.get(
        { applicationId: 'app-001', includeTimeline: false },
        new Metadata()
      );
      expect(receivedApplicationId).toBe('app-001');
      expect(result.application?.applicationId).toBe('app-001');
      expect(result.application?.adopterId).toBe('adopter-1');
    } finally {
      client.close();
    }
  });

  // ── 2. Write: startDraft ─────────────────────────────────────────

  it('startDraft — request fields arrive and response round-trips', async () => {
    const want: StartDraftResponse = {
      application: {
        applicationId: 'app-new',
        adopterId: 'adopter-2',
        petId: 'pet-2',
        rescueId: 'rescue-1',
        status: 0,
        answersJson: '{}',
        referencesJson: '[]',
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };

    let capturedAdopterId = '';
    let capturedPetId = '';

    port = await startServer(
      makeHandlers({
        startDraft: (
          call: ServerUnaryCall<StartDraftRequest, StartDraftResponse>,
          cb: sendUnaryData<StartDraftResponse>
        ) => {
          capturedAdopterId = call.request.adopterId;
          capturedPetId = call.request.petId;
          cb(null, want);
        },
      })
    );

    const client = createApplicationsClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.startDraft(
        { adopterId: 'adopter-2', petId: 'pet-2' },
        new Metadata()
      );
      expect(capturedAdopterId).toBe('adopter-2');
      expect(capturedPetId).toBe('pet-2');
      expect(result.application?.applicationId).toBe('app-new');
    } finally {
      client.close();
    }
  });

  // ── 3. Error contract ────────────────────────────────────────────

  it('get — NOT_FOUND from the server surfaces with .code === status.NOT_FOUND', async () => {
    port = await startServer(
      makeHandlers({
        get: (
          _call: ServerUnaryCall<GetApplicationRequest, GetApplicationResponse>,
          cb: sendUnaryData<GetApplicationResponse>
        ) => {
          cb(makeServiceError(status.NOT_FOUND, 'application not found'), null);
        },
      })
    );

    const client = createApplicationsClient({ address: `127.0.0.1:${port}` });
    try {
      await client.get({ applicationId: 'missing', includeTimeline: false }, new Metadata());
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.NOT_FOUND);
    } finally {
      client.close();
    }
  });
});
