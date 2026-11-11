// Contract tests for the gateway rescue-client.
//
// Boots a real @grpc/grpc-js Server with RescueV1.RescueServiceService and
// verifies:
//   1. Happy-path read: get() — typed request arrives, typed response
//      round-trips.
//   2. Happy-path write: create() — request fields arrive and response
//      round-trips.
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
  RescueV1,
  type RescueCheckSelfErasureRequest,
  type RescueCheckSelfErasureResponse,
  type CreateRescueRequest,
  type CreateRescueResponse,
  type GetRescueNamesRequest,
  type GetRescueNamesResponse,
  type GetRescueRequest,
  type GetRescueResponse,
} from '@adopt-dont-shop/proto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createRescueClient } from './rescue-client.js';

import { unimplementedHandlers } from '../../test/helpers/unimplemented-handlers.js';

// ── helpers ──────────────────────────────────────────────────────────

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

const makeHandlers = (
  overrides: Partial<RescueV1.RescueServiceServer>
): RescueV1.RescueServiceServer =>
  unimplementedHandlers<RescueV1.RescueServiceServer>(RescueV1.RescueServiceService, overrides);

// Minimal valid Rescue satisfying proto serialization constraints.
const minimalRescue: RescueV1.Rescue = {
  rescueId: 'rescue-001',
  name: 'Happy Paws',
  email: 'info@happypaws.org',
  address: '1 Main St',
  city: 'London',
  postcode: 'SW1A 1AA',
  country: 'GB',
  contactPerson: 'Jane Smith',
  status: 0,
  settingsJson: '{}',
  plan: 'free',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ── suite ─────────────────────────────────────────────────────────────

describe('rescue-client — gRPC contract', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = (handlers: RescueV1.RescueServiceServer): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.addService(RescueV1.RescueServiceService, handlers);
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      });
    });

  // ── 1. Read: get ─────────────────────────────────────────────────

  it('get — request rescueId arrives and typed response round-trips', async () => {
    const want: GetRescueResponse = { rescue: { ...minimalRescue } };
    let receivedRescueId = '';

    port = await startServer(
      makeHandlers({
        get: (
          call: ServerUnaryCall<GetRescueRequest, GetRescueResponse>,
          cb: sendUnaryData<GetRescueResponse>
        ) => {
          receivedRescueId = call.request.rescueId;
          cb(null, want);
        },
      })
    );

    const client = createRescueClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.get({ rescueId: 'rescue-001' }, new Metadata());
      expect(receivedRescueId).toBe('rescue-001');
      expect(result.rescue?.rescueId).toBe('rescue-001');
      expect(result.rescue?.name).toBe('Happy Paws');
    } finally {
      client.close();
    }
  });

  it('checkSelfErasure — the blocked verdict and reason round-trip', async () => {
    const want: RescueCheckSelfErasureResponse = {
      allowed: false,
      blockedReason: 'last_rescue_staff',
    };

    port = await startServer(
      makeHandlers({
        checkSelfErasure: (
          _call: ServerUnaryCall<RescueCheckSelfErasureRequest, RescueCheckSelfErasureResponse>,
          cb: sendUnaryData<RescueCheckSelfErasureResponse>
        ) => cb(null, want),
      })
    );

    const client = createRescueClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.checkSelfErasure({}, new Metadata());
      expect(result).toEqual(want);
    } finally {
      client.close();
    }
  });

  // ── 2. Write: create ─────────────────────────────────────────────

  it('create — request fields arrive and response rescue round-trips', async () => {
    const want: CreateRescueResponse = {
      rescue: { ...minimalRescue, rescueId: 'rescue-new', name: 'Second Chances' },
    };

    let capturedName = '';
    let capturedEmail = '';

    port = await startServer(
      makeHandlers({
        create: (
          call: ServerUnaryCall<CreateRescueRequest, CreateRescueResponse>,
          cb: sendUnaryData<CreateRescueResponse>
        ) => {
          capturedName = call.request.name;
          capturedEmail = call.request.email;
          cb(null, want);
        },
      })
    );

    const client = createRescueClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.create(
        {
          name: 'Second Chances',
          email: 'info@sc.org',
          address: '2 High St',
          city: 'Manchester',
          postcode: 'M1 1AA',
          contactPerson: 'Bob Jones',
        },
        new Metadata()
      );
      expect(capturedName).toBe('Second Chances');
      expect(capturedEmail).toBe('info@sc.org');
      expect(result.rescue?.rescueId).toBe('rescue-new');
    } finally {
      client.close();
    }
  });

  // ── 3. Error contract ────────────────────────────────────────────

  it('get — NOT_FOUND from the server surfaces with .code === status.NOT_FOUND', async () => {
    port = await startServer(
      makeHandlers({
        get: (
          _call: ServerUnaryCall<GetRescueRequest, GetRescueResponse>,
          cb: sendUnaryData<GetRescueResponse>
        ) => {
          cb(makeServiceError(status.NOT_FOUND, 'rescue not found'), null);
        },
      })
    );

    const client = createRescueClient({ address: `127.0.0.1:${port}` });
    try {
      await client.get({ rescueId: 'missing' }, new Metadata());
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.NOT_FOUND);
    } finally {
      client.close();
    }
  });

  // ── 4. getRescueNames ────────────────────────────────────────────

  it('getRescueNames — ids arrive in one request and names round-trip', async () => {
    let receivedIds: string[] = [];
    port = await startServer(
      makeHandlers({
        getRescueNames: (
          call: ServerUnaryCall<GetRescueNamesRequest, GetRescueNamesResponse>,
          cb: sendUnaryData<GetRescueNamesResponse>
        ) => {
          receivedIds = call.request.rescueIds;
          cb(null, { names: [{ rescueId: 'r-1', name: 'Paws' }] });
        },
      })
    );

    const client = createRescueClient({ address: `127.0.0.1:${port}` });
    try {
      const result = await client.getRescueNames({ rescueIds: ['r-1', 'r-2'] }, new Metadata());
      expect(receivedIds).toEqual(['r-1', 'r-2']);
      expect(result.names).toEqual([{ rescueId: 'r-1', name: 'Paws' }]);
    } finally {
      client.close();
    }
  });

  it('getRescueNames — a per-call budget cancels a stalled call with DEADLINE_EXCEEDED, once', async () => {
    let calls = 0;
    port = await startServer(
      makeHandlers({
        // Never answers: only the client-side deadline can end this call.
        getRescueNames: () => {
          calls += 1;
        },
      })
    );

    const client = createRescueClient({ address: `127.0.0.1:${port}` });
    const startedAt = Date.now();
    try {
      await client.getRescueNames({ rescueIds: ['r-1'] }, new Metadata(), {
        deadlineMs: 100,
        maxRetries: 0,
      });
      expect.fail('expected rejection');
    } catch (err: unknown) {
      expect((err as { code?: number }).code).toBe(status.DEADLINE_EXCEEDED);
      expect(Date.now() - startedAt).toBeLessThan(2_000);
      expect(calls).toBe(1);
    } finally {
      client.close();
    }
  });
});
