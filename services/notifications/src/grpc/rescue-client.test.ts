// Behaviour tests for the notifications rescue-client. Mirrors the
// auth-client test: a real @grpc/grpc-js Server bound to 127.0.0.1:0; torn
// down in afterEach.

import {
  Metadata,
  Server,
  ServerCredentials,
  ServerUnaryCall,
  sendUnaryData,
  ServiceError,
  status,
} from '@grpc/grpc-js';

import {
  RescueV1,
  type GetRescueRequest,
  type GetRescueResponse,
  type ListStaffMembersRequest,
  type ListStaffMembersResponse,
} from '@adopt-dont-shop/proto';
import {
  PRINCIPAL_TOKEN_HEADER,
  resetDefaultPrincipalSigningKeyForTests,
  verifyPrincipalToken,
} from '@adopt-dont-shop/service-bootstrap';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createRescueClient } from './rescue-client.js';

const makeServiceError = (code: number, details: string): ServiceError => {
  const err = new Error(details) as ServiceError;
  err.code = code;
  err.details = details;
  err.metadata = new Metadata();
  return err;
};

describe('createRescueClient — staff + rescue lookups', () => {
  let server: Server;
  let port: number;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const startServer = async (): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) =>
        err ? reject(err) : resolve(boundPort)
      );
    });

  it('maps ListStaffMembers down to the staff user_ids', async () => {
    server.addService(RescueV1.RescueServiceService, {
      listStaffMembers: (
        _call: ServerUnaryCall<ListStaffMembersRequest, ListStaffMembersResponse>,
        cb: sendUnaryData<ListStaffMembersResponse>
      ) => {
        cb(null, {
          staffMembers: [
            {
              staffMemberId: 'sm-1',
              userId: 'usr-1',
              rescueId: 'res-1',
              isVerified: true,
              addedBy: 'usr-admin',
              addedAt: '2026-01-01T00:00:00Z',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            },
            {
              staffMemberId: 'sm-2',
              userId: 'usr-2',
              rescueId: 'res-1',
              isVerified: true,
              addedBy: 'usr-admin',
              addedAt: '2026-01-02T00:00:00Z',
              createdAt: '2026-01-02T00:00:00Z',
              updatedAt: '2026-01-02T00:00:00Z',
            },
          ],
        });
      },
    });

    port = await startServer();
    const client = createRescueClient({ address: `127.0.0.1:${port}`, deadlineMs: 2_000 });
    try {
      expect(await client.listStaffMembers('res-1')).toEqual(['usr-1', 'usr-2']);
    } finally {
      client.close();
    }
  });

  it('returns the rescue name from Get', async () => {
    server.addService(RescueV1.RescueServiceService, {
      get: (
        _call: ServerUnaryCall<GetRescueRequest, GetRescueResponse>,
        cb: sendUnaryData<GetRescueResponse>
      ) => {
        // fromPartial fills every required scalar (e.g. the status enum) so
        // the proto serializer doesn't choke on undefined int32 fields.
        cb(null, {
          rescue: RescueV1.Rescue.fromPartial({ rescueId: 'res-1', name: 'Happy Tails' }),
        });
      },
    });

    port = await startServer();
    const client = createRescueClient({ address: `127.0.0.1:${port}`, deadlineMs: 2_000 });
    try {
      expect(await client.getRescueName('res-1')).toBe('Happy Tails');
    } finally {
      client.close();
    }
  });

  it('retries ListStaffMembers on a transient UNAVAILABLE', async () => {
    let callCount = 0;
    server.addService(RescueV1.RescueServiceService, {
      listStaffMembers: (
        _call: ServerUnaryCall<ListStaffMembersRequest, ListStaffMembersResponse>,
        cb: sendUnaryData<ListStaffMembersResponse>
      ) => {
        callCount += 1;
        if (callCount === 1) {
          cb(makeServiceError(status.UNAVAILABLE, 'service unavailable'), null);
        } else {
          cb(null, { staffMembers: [] });
        }
      },
    });

    port = await startServer();
    const client = createRescueClient({ address: `127.0.0.1:${port}`, deadlineMs: 2_000 });
    try {
      expect(await client.listStaffMembers('res-1')).toEqual([]);
      expect(callCount).toBe(2);
    } finally {
      client.close();
    }
  });
});

describe('createRescueClient — signed system principal (ADS-800)', () => {
  const SIGNING_KEY = 'notifications-test-signing-key';
  let server: Server;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    delete process.env.PRINCIPAL_SIGNING_KEY;
    resetDefaultPrincipalSigningKeyForTests();
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  it('stamps a super_admin principal carrying staff.read + rescues.read so it can read any rescue', async () => {
    process.env.PRINCIPAL_SIGNING_KEY = SIGNING_KEY;
    resetDefaultPrincipalSigningKeyForTests();

    const captured: Metadata[] = [];
    server.addService(RescueV1.RescueServiceService, {
      listStaffMembers: (
        call: ServerUnaryCall<ListStaffMembersRequest, ListStaffMembersResponse>,
        cb: sendUnaryData<ListStaffMembersResponse>
      ) => {
        captured.push(call.metadata);
        cb(null, { staffMembers: [] });
      },
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) =>
        err ? reject(err) : resolve(boundPort)
      );
    });

    const client = createRescueClient({ address: `127.0.0.1:${port}` });
    try {
      await client.listStaffMembers('res-1');
      expect(captured).toHaveLength(1);
      const token = String(captured[0].get(PRINCIPAL_TOKEN_HEADER)[0]);
      const principal = verifyPrincipalToken(token, SIGNING_KEY);
      expect(principal.userId).toBe('svc-notifications');
      expect(principal.roles).toEqual(['super_admin']);
      expect(principal.permissions).toEqual(['staff.read', 'rescues.read']);
    } finally {
      client.close();
    }
  });
});
