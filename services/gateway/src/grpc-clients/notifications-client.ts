// Promise-wrapped client for service.notifications.
//
// @grpc/grpc-js generates callback-shaped methods on the
// NotificationServiceClient (e.g. `client.create(req, metadata, callback)`).
// The Fastify route layer wants async/await semantics, so this module
// thinly wraps the three methods into Promises and bundles them under
// a single typed shape.
//
// The interface (`NotificationsClient`) is exported so tests can
// substitute a mock — the route plugin depends on the shape, not the
// gRPC client directly.

import { credentials, Metadata } from '@grpc/grpc-js';

import {
  NotificationsV1,
  type CreateNotificationRequest,
  type CreateNotificationResponse,
  type DismissNotificationRequest,
  type DismissNotificationResponse,
  type ListDeviceTokensRequest,
  type ListDeviceTokensResponse,
  type ListNotificationsRequest,
  type ListNotificationsResponse,
  type RegisterDeviceTokenRequest,
  type RegisterDeviceTokenResponse,
  type UnregisterDeviceTokenRequest,
  type UnregisterDeviceTokenResponse,
} from '@adopt-dont-shop/proto';

export type NotificationsClient = {
  create(req: CreateNotificationRequest, metadata: Metadata): Promise<CreateNotificationResponse>;
  list(req: ListNotificationsRequest, metadata: Metadata): Promise<ListNotificationsResponse>;
  dismiss(
    req: DismissNotificationRequest,
    metadata: Metadata
  ): Promise<DismissNotificationResponse>;
  registerDeviceToken(
    req: RegisterDeviceTokenRequest,
    metadata: Metadata
  ): Promise<RegisterDeviceTokenResponse>;
  unregisterDeviceToken(
    req: UnregisterDeviceTokenRequest,
    metadata: Metadata
  ): Promise<UnregisterDeviceTokenResponse>;
  listDeviceTokens(
    req: ListDeviceTokensRequest,
    metadata: Metadata
  ): Promise<ListDeviceTokensResponse>;
  close(): void;
};

export type CreateNotificationsClientOptions = {
  // grpc-js dial target. Plain `host:port` in dev (insecure, matches
  // service.notifications's `ServerCredentials.createInsecure()`); a
  // future deploy can swap in TLS via a different credentials choice
  // here.
  address: string;
};

export const createNotificationsClient = (
  opts: CreateNotificationsClientOptions
): NotificationsClient => {
  const stub = new NotificationsV1.NotificationServiceClient(
    opts.address,
    credentials.createInsecure()
  );

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
    create: (req, metadata) => callUnary(stub.create, req, metadata),
    list: (req, metadata) => callUnary(stub.list, req, metadata),
    dismiss: (req, metadata) => callUnary(stub.dismiss, req, metadata),
    registerDeviceToken: (req, metadata) => callUnary(stub.registerDeviceToken, req, metadata),
    unregisterDeviceToken: (req, metadata) => callUnary(stub.unregisterDeviceToken, req, metadata),
    listDeviceTokens: (req, metadata) => callUnary(stub.listDeviceTokens, req, metadata),
    close: () => stub.close(),
  };
};
