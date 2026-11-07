// Behaviour tests for the pets -> rescue gRPC client. Each test binds a real
// @grpc/grpc-js Server to 127.0.0.1:0 and tears it down afterwards.
//   1. getRescue and listStaffMembers both reach the rescue service as the
//      pets SYSTEM principal, which must NOT hold `rescues.read` (so Get
//      only ever resolves VERIFIED rescues).
//   2. NOT_FOUND is surfaced as-is after exactly one attempt (no retry).

import {
  Metadata,
  Server,
  ServerCredentials,
  ServerUnaryCall,
  sendUnaryData,
  ServiceError,
  status,
} from '@grpc/grpc-js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  RescueV1,
  type GetRescueRequest,
  type GetRescueResponse,
  type ListStaffMembersRequest,
  type ListStaffMembersResponse,
} from '@adopt-dont-shop/proto';

import { createRescueClient } from './rescue-client.js';

const notFound = (): ServiceError => {
  const err = new Error('not found') as ServiceError;
  err.code = status.NOT_FOUND;
  err.details = 'not found';
  err.metadata = new Metadata();
  return err;
};

describe('createRescueClient (pets)', () => {
  let server: Server;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  const start = (): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, port) =>
        err ? reject(err) : resolve(port)
      );
    });

  it('calls Get and ListStaffMembers as a system principal without rescues.read', async () => {
    const captured: Metadata[] = [];
    server.addService(RescueV1.RescueServiceService, {
      get: (
        call: ServerUnaryCall<GetRescueRequest, GetRescueResponse>,
        cb: sendUnaryData<GetRescueResponse>
      ) => {
        captured.push(call.metadata);
        cb(null, { rescue: undefined });
      },
      listStaffMembers: (
        call: ServerUnaryCall<ListStaffMembersRequest, ListStaffMembersResponse>,
        cb: sendUnaryData<ListStaffMembersResponse>
      ) => {
        captured.push(call.metadata);
        cb(null, {
          staffMembers: [RescueV1.StaffMember.fromPartial({ userId: 'usr-1', rescueId: 'rsc-1' })],
        });
      },
    });
    const client = createRescueClient({ address: `127.0.0.1:${await start()}` });

    try {
      await client.getRescue({ rescueId: 'rsc-1' });
      const staff = await client.listStaffMembers({ rescueId: 'rsc-1' });

      expect(staff.staffMembers.map(m => m.userId)).toEqual(['usr-1']);
      expect(captured).toHaveLength(2);
      captured.forEach(meta => {
        expect(meta.get('x-user-id')).toEqual(['svc-pets']);
        const permissions = String(meta.get('x-user-permissions')[0]).split(',');
        expect(permissions).toContain('staff.read');
        expect(permissions).not.toContain('rescues.read');
      });
    } finally {
      client.close();
    }
  });

  it('gives up within the overall budget even if each attempt would allow longer', async () => {
    server.addService(RescueV1.RescueServiceService, {
      // Never answers: only the deadline can end the call.
      get: () => undefined,
    });
    const client = createRescueClient({
      address: `127.0.0.1:${await start()}`,
      deadlineMs: 5_000,
      budgetMs: 300,
    });

    try {
      const startedAt = Date.now();
      await expect(client.getRescue({ rescueId: 'rsc-1' })).rejects.toMatchObject({
        code: status.DEADLINE_EXCEEDED,
      });
      expect(Date.now() - startedAt).toBeLessThan(2_000);
    } finally {
      client.close();
    }
  });

  it('surfaces NOT_FOUND from Get without retrying', async () => {
    let calls = 0;
    server.addService(RescueV1.RescueServiceService, {
      get: (
        _call: ServerUnaryCall<GetRescueRequest, GetRescueResponse>,
        cb: sendUnaryData<GetRescueResponse>
      ) => {
        calls += 1;
        cb(notFound(), null);
      },
    });
    const client = createRescueClient({ address: `127.0.0.1:${await start()}` });

    try {
      await expect(client.getRescue({ rescueId: 'rsc-1' })).rejects.toMatchObject({
        code: status.NOT_FOUND,
      });
      expect(calls).toBe(1);
    } finally {
      client.close();
    }
  });
});
