// Behaviour tests for the moderation -> auth gRPC client. Each test binds a
// real @grpc/grpc-js Server to 127.0.0.1:0 and tears it down afterwards.

import {
  Metadata,
  Server,
  ServerCredentials,
  status,
  type ServerUnaryCall,
  type ServiceError,
  type sendUnaryData,
} from '@grpc/grpc-js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthV1 } from '@adopt-dont-shop/proto';

import { createAuthClient, grpcStatusToHandlerCode } from './auth-client.js';

describe('createAuthClient (moderation)', () => {
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

  it('suspends a user through AdminUpdateUser with the forwarded metadata', async () => {
    const seen: { req?: AuthV1.AdminUpdateUserRequest; meta?: Metadata } = {};
    server.addService(AuthV1.AuthServiceService, {
      adminUpdateUser: (
        call: ServerUnaryCall<AuthV1.AdminUpdateUserRequest, AuthV1.AdminUpdateUserResponse>,
        cb: sendUnaryData<AuthV1.AdminUpdateUserResponse>
      ) => {
        seen.req = call.request;
        seen.meta = call.metadata;
        cb(null, {});
      },
    });
    const client = createAuthClient({ address: `127.0.0.1:${await start()}` });
    const metadata = new Metadata();
    metadata.set('x-user-id', 'mod-1');

    try {
      await client.suspendUser('usr-2', metadata);
      expect(seen.req?.userId).toBe('usr-2');
      expect(seen.req?.status).toBe(AuthV1.UserStatus.USER_STATUS_SUSPENDED);
      expect(seen.meta?.get('x-user-id')).toEqual(['mod-1']);
    } finally {
      client.close();
    }
  });

  it('deactivates a user through DeactivateUser', async () => {
    let userId = '';
    server.addService(AuthV1.AuthServiceService, {
      deactivateUser: (
        call: ServerUnaryCall<AuthV1.DeactivateUserRequest, AuthV1.DeactivateUserResponse>,
        cb: sendUnaryData<AuthV1.DeactivateUserResponse>
      ) => {
        userId = call.request.userId;
        cb(null, {});
      },
    });
    const client = createAuthClient({ address: `127.0.0.1:${await start()}` });

    try {
      await client.deactivateUser('usr-2', new Metadata());
      expect(userId).toBe('usr-2');
    } finally {
      client.close();
    }
  });

  it("revokes all of a user's sessions through AdminRevokeAllUserSessions", async () => {
    let userId = '';
    server.addService(AuthV1.AuthServiceService, {
      adminRevokeAllUserSessions: (
        call: ServerUnaryCall<
          AuthV1.AdminRevokeAllUserSessionsRequest,
          AuthV1.AdminRevokeAllUserSessionsResponse
        >,
        cb: sendUnaryData<AuthV1.AdminRevokeAllUserSessionsResponse>
      ) => {
        userId = call.request.userId;
        cb(null, { revokedCount: 2 });
      },
    });
    const client = createAuthClient({ address: `127.0.0.1:${await start()}` });

    try {
      await client.revokeAllSessions('usr-2', new Metadata());
      expect(userId).toBe('usr-2');
    } finally {
      client.close();
    }
  });

  it('rejects with the downstream error when auth refuses', async () => {
    server.addService(AuthV1.AuthServiceService, {
      deactivateUser: (
        _call: ServerUnaryCall<AuthV1.DeactivateUserRequest, AuthV1.DeactivateUserResponse>,
        cb: sendUnaryData<AuthV1.DeactivateUserResponse>
      ) => {
        const err = new Error('denied') as ServiceError;
        err.code = status.PERMISSION_DENIED;
        err.details = 'denied';
        err.metadata = new Metadata();
        cb(err, null);
      },
    });
    const client = createAuthClient({ address: `127.0.0.1:${await start()}` });

    try {
      await expect(client.deactivateUser('usr-2', new Metadata())).rejects.toMatchObject({
        code: status.PERMISSION_DENIED,
      });
    } finally {
      client.close();
    }
  });
});

describe('grpcStatusToHandlerCode', () => {
  it.each([
    [status.INVALID_ARGUMENT, 'INVALID_ARGUMENT'],
    [status.UNAUTHENTICATED, 'UNAUTHENTICATED'],
    [status.PERMISSION_DENIED, 'PERMISSION_DENIED'],
    [status.NOT_FOUND, 'NOT_FOUND'],
    [status.UNAVAILABLE, 'UNAVAILABLE'],
    [status.DATA_LOSS, 'INTERNAL'],
  ])('maps gRPC status %i to %s', (code, expected) => {
    expect(grpcStatusToHandlerCode({ code })).toBe(expected);
  });

  it('maps a non-gRPC error to INTERNAL', () => {
    expect(grpcStatusToHandlerCode(new Error('boom'))).toBe('INTERNAL');
  });
});
