// Behaviour tests for the matching rescue-client. Mirrors
// services/notifications/src/grpc/rescue-client.test.ts: a real
// @grpc/grpc-js Server bound to 127.0.0.1:0, torn down in afterEach.

import {
  Metadata,
  Server,
  ServerCredentials,
  ServerUnaryCall,
  sendUnaryData,
  ServiceError,
  status,
} from '@grpc/grpc-js';

import { RescueV1, type GetRescueRequest, type GetRescueResponse } from '@adopt-dont-shop/proto';
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

describe('createRescueClient — rescue name lookup', () => {
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

  it('returns the rescue name from Get', async () => {
    server.addService(RescueV1.RescueServiceService, {
      get: (
        _call: ServerUnaryCall<GetRescueRequest, GetRescueResponse>,
        cb: sendUnaryData<GetRescueResponse>
      ) => {
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

  it('returns null when the rescue has no name set', async () => {
    server.addService(RescueV1.RescueServiceService, {
      get: (
        _call: ServerUnaryCall<GetRescueRequest, GetRescueResponse>,
        cb: sendUnaryData<GetRescueResponse>
      ) => {
        cb(null, { rescue: undefined });
      },
    });

    port = await startServer();
    const client = createRescueClient({ address: `127.0.0.1:${port}`, deadlineMs: 2_000 });
    try {
      expect(await client.getRescueName('res-missing')).toBeNull();
    } finally {
      client.close();
    }
  });

  it('retries Get on a transient UNAVAILABLE', async () => {
    let callCount = 0;
    server.addService(RescueV1.RescueServiceService, {
      get: (
        _call: ServerUnaryCall<GetRescueRequest, GetRescueResponse>,
        cb: sendUnaryData<GetRescueResponse>
      ) => {
        callCount += 1;
        if (callCount === 1) {
          cb(makeServiceError(status.UNAVAILABLE, 'service unavailable'), null);
        } else {
          cb(null, { rescue: RescueV1.Rescue.fromPartial({ rescueId: 'res-1', name: 'Retried' }) });
        }
      },
    });

    port = await startServer();
    const client = createRescueClient({ address: `127.0.0.1:${port}`, deadlineMs: 2_000 });
    try {
      expect(await client.getRescueName('res-1')).toBe('Retried');
      expect(callCount).toBe(2);
    } finally {
      client.close();
    }
  });
});

describe('createRescueClient — signed system principal', () => {
  const SIGNING_KEY = 'matching-test-signing-key';
  let server: Server;

  beforeEach(() => {
    server = new Server();
  });

  afterEach(async () => {
    delete process.env.PRINCIPAL_SIGNING_KEY;
    resetDefaultPrincipalSigningKeyForTests();
    await new Promise<void>(resolve => server.tryShutdown(() => resolve()));
  });

  it('stamps a super_admin principal carrying rescues.read so it can read any rescue', async () => {
    process.env.PRINCIPAL_SIGNING_KEY = SIGNING_KEY;
    resetDefaultPrincipalSigningKeyForTests();

    const captured: Metadata[] = [];
    server.addService(RescueV1.RescueServiceService, {
      get: (
        call: ServerUnaryCall<GetRescueRequest, GetRescueResponse>,
        cb: sendUnaryData<GetRescueResponse>
      ) => {
        captured.push(call.metadata);
        cb(null, { rescue: undefined });
      },
    });
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (err, boundPort) =>
        err ? reject(err) : resolve(boundPort)
      );
    });

    const client = createRescueClient({ address: `127.0.0.1:${port}` });
    try {
      await client.getRescueName('res-1');
      expect(captured).toHaveLength(1);
      const token = String(captured[0].get(PRINCIPAL_TOKEN_HEADER)[0]);
      const principal = verifyPrincipalToken(token, SIGNING_KEY);
      expect(principal.userId).toBe('svc-matching');
      expect(principal.roles).toEqual(['super_admin']);
      expect(principal.permissions).toEqual(['rescues.read']);
    } finally {
      client.close();
    }
  });
});
