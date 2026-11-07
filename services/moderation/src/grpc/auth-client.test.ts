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

  const serve = (
    handler: (
      call: ServerUnaryCall<AuthV1.ApplyUserSanctionRequest, AuthV1.ApplyUserSanctionResponse>,
      cb: sendUnaryData<AuthV1.ApplyUserSanctionResponse>
    ) => void
  ) => server.addService(AuthV1.AuthServiceService, { applyUserSanction: handler });

  it('suspends with the expiry and the human actor, as a service principal holding only the sanction permission', async () => {
    const seen: { req?: AuthV1.ApplyUserSanctionRequest; meta?: Metadata } = {};
    serve((call, cb) => {
      seen.req = call.request;
      seen.meta = call.metadata;
      cb(null, { userId: 'usr-2', status: AuthV1.UserStatus.USER_STATUS_SUSPENDED });
    });
    const client = createAuthClient({ address: `127.0.0.1:${await start()}` });

    try {
      await client.applyUserSanction({
        userId: 'usr-2',
        kind: 'suspend',
        reason: 'repeated spam',
        actorUserId: 'mod-1',
        expiresAt: '2099-01-01T00:00:00.000Z',
      });
      expect(seen.req).toMatchObject({
        userId: 'usr-2',
        kind: AuthV1.UserSanctionKind.USER_SANCTION_KIND_SUSPEND,
        reason: 'repeated spam',
        actorUserId: 'mod-1',
        expiresAt: '2099-01-01T00:00:00.000Z',
      });
      expect(seen.meta?.get('x-user-id')).toEqual(['svc-moderation']);
      expect(String(seen.meta?.get('x-user-permissions')[0]).split(',')).toEqual([
        'moderation.users.sanction',
      ]);
    } finally {
      client.close();
    }
  });

  it('bans without an expiry', async () => {
    let req: AuthV1.ApplyUserSanctionRequest | undefined;
    serve((call, cb) => {
      req = call.request;
      cb(null, { userId: 'usr-2', status: AuthV1.UserStatus.USER_STATUS_SUSPENDED });
    });
    const client = createAuthClient({ address: `127.0.0.1:${await start()}` });

    try {
      await client.applyUserSanction({
        userId: 'usr-2',
        kind: 'ban',
        reason: 'abuse',
        actorUserId: 'mod-1',
      });
      expect(req?.kind).toBe(AuthV1.UserSanctionKind.USER_SANCTION_KIND_BAN);
      expect(req?.expiresAt).toBeUndefined();
    } finally {
      client.close();
    }
  });

  it('rejects with the downstream error when auth refuses', async () => {
    serve((_call, cb) => {
      const err = new Error('denied') as ServiceError;
      err.code = status.PERMISSION_DENIED;
      err.details = 'denied';
      err.metadata = new Metadata();
      cb(err, null);
    });
    const client = createAuthClient({ address: `127.0.0.1:${await start()}` });

    try {
      await expect(
        client.applyUserSanction({
          userId: 'usr-2',
          kind: 'ban',
          reason: 'abuse',
          actorUserId: 'mod-1',
        })
      ).rejects.toMatchObject({ code: status.PERMISSION_DENIED });
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
    [status.FAILED_PRECONDITION, 'FAILED_PRECONDITION'],
    [status.DATA_LOSS, 'INTERNAL'],
  ])('maps gRPC status %i to %s', (code, expected) => {
    expect(grpcStatusToHandlerCode({ code })).toBe(expected);
  });

  it('maps a non-gRPC error to INTERNAL', () => {
    expect(grpcStatusToHandlerCode(new Error('boom'))).toBe('INTERNAL');
  });
});
