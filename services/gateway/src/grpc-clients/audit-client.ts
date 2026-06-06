// Promise-wrapped client for service.audit.
//
// Phase 10.5 surface — AuditQueryService.{Query, GetByTarget}. The
// Phase 2.5 authenticate middleware populates x-user-* metadata; the
// service handlers re-check the admin.audit_logs permission as
// defence-in-depth (#915).
//
// The interface is exported so tests can substitute a mock; the
// routes depend on the shape, not the @grpc/grpc-js client.

import { credentials, Metadata } from '@grpc/grpc-js';

import {
  AuditV1,
  type AuditGetByTargetRequest,
  type AuditGetByTargetResponse,
  type AuditQueryRequest,
  type AuditQueryResponse,
} from '@adopt-dont-shop/proto';

export type AuditClient = {
  query(req: AuditQueryRequest, metadata: Metadata): Promise<AuditQueryResponse>;
  getByTarget(req: AuditGetByTargetRequest, metadata: Metadata): Promise<AuditGetByTargetResponse>;
  close(): void;
};

export type CreateAuditClientOptions = {
  address: string;
};

export const createAuditClient = (opts: CreateAuditClientOptions): AuditClient => {
  const stub = new AuditV1.AuditQueryServiceClient(opts.address, credentials.createInsecure());

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
    query: (req, metadata) => callUnary(stub.query, req, metadata),
    getByTarget: (req, metadata) => callUnary(stub.getByTarget, req, metadata),
    close: () => stub.close(),
  };
};
