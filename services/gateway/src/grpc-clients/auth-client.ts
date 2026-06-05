// Promise-wrapped client for service.auth.
//
// Phase 2.5 surface — only ValidateToken is callable from the gateway.
// Login / Logout / RefreshToken / GetMe / AssignRole arrive when the
// gateway routes /api/auth/* through here (Phase 2.6).
//
// Same shape as services/gateway/src/grpc-clients/notifications-client.ts:
// the interface is exported so tests can substitute a mock; the
// middleware depends on the shape, not the @grpc/grpc-js client.

import { credentials, Metadata } from '@grpc/grpc-js';

import {
  AuthV1,
  type ValidateTokenRequest,
  type ValidateTokenResponse,
} from '@adopt-dont-shop/proto';

export type AuthClient = {
  validateToken(req: ValidateTokenRequest, metadata: Metadata): Promise<ValidateTokenResponse>;
  close(): void;
};

export type CreateAuthClientOptions = {
  address: string;
};

export const createAuthClient = (opts: CreateAuthClientOptions): AuthClient => {
  const stub = new AuthV1.AuthServiceClient(opts.address, credentials.createInsecure());

  const callUnary = <Req, Res>(
    fn: (req: Req, metadata: Metadata, cb: (err: unknown, res: Res) => void) => unknown,
    req: Req,
    metadata: Metadata
  ): Promise<Res> =>
    new Promise<Res>((resolve, reject) => {
      fn.call(stub, req, metadata, (err: unknown, res: Res) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });

  return {
    validateToken: (req, metadata) => callUnary(stub.validateToken, req, metadata),
    close: () => stub.close(),
  };
};
