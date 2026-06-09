// Promise-wrapped client for service.auth — just the cohort RPC the
// broadcast handler needs. Defining it locally (rather than depending on
// the gateway's full AuthClient interface) keeps the notifications
// service decoupled from the gateway and means a slimmer dial table.

import { credentials, Metadata } from '@grpc/grpc-js';

import {
  AuthV1,
  type ListUserIdsByCohortRequest,
  type ListUserIdsByCohortResponse,
} from '@adopt-dont-shop/proto';

import type { AuthCohortClient } from './handlers.js';

export type CreateAuthCohortClientOptions = {
  address: string;
  // System principal metadata — needed because ListUserIdsByCohort gates
  // on admin.users.broadcast. The notifications service runs as
  // `svc-notifications` with the same permission seeded by the auth
  // service. Stamping it here means callers (the broadcast handler)
  // don't need to thread metadata through — they're already gating
  // on admin.notifications.broadcast against the caller's principal.
  systemUserId?: string;
  systemRoles?: string;
  systemPermissions?: string;
};

export function createAuthCohortClient(opts: CreateAuthCohortClientOptions): AuthCohortClient & {
  close(): void;
} {
  const stub = new AuthV1.AuthServiceClient(opts.address, credentials.createInsecure());
  const systemMeta = new Metadata();
  systemMeta.set('x-user-id', opts.systemUserId ?? 'svc-notifications');
  systemMeta.set('x-user-roles', opts.systemRoles ?? 'admin');
  systemMeta.set('x-user-permissions', opts.systemPermissions ?? 'admin.users.broadcast');

  return {
    listUserIdsByCohort: (req: ListUserIdsByCohortRequest): Promise<ListUserIdsByCohortResponse> =>
      new Promise((resolve, reject) => {
        stub.listUserIdsByCohort(req, systemMeta, (err, res) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(res);
        });
      }),
    close: () => stub.close(),
  };
}
