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

import { credentials, Metadata, type CallOptions } from '@grpc/grpc-js';

import {
  NotificationsV1,
  type CreateNotificationRequest,
  type CreateNotificationResponse,
  type DeleteNotificationRequest,
  type DeleteNotificationResponse,
  type DismissNotificationRequest,
  type DismissNotificationResponse,
  type GetNotificationPreferencesRequest,
  type GetNotificationPreferencesResponse,
  type GetNotificationRequest,
  type GetNotificationResponse,
  type GetUnreadCountRequest,
  type GetUnreadCountResponse,
  type ListDeviceTokensRequest,
  type ListDeviceTokensResponse,
  type ListNotificationsRequest,
  type ListNotificationsResponse,
  type MarkAllReadRequest,
  type MarkAllReadResponse,
  type RegisterDeviceTokenRequest,
  type RegisterDeviceTokenResponse,
  type UnregisterDeviceTokenRequest,
  type UnregisterDeviceTokenResponse,
  type UpdateNotificationPreferencesRequest,
  type UpdateNotificationPreferencesResponse,
  type ResetNotificationPreferencesRequest,
  type ResetNotificationPreferencesResponse,
  type CleanupExpiredNotificationsRequest,
  type CleanupExpiredNotificationsResponse,
  type ListEmailTemplatesRequest,
  type ListEmailTemplatesResponse,
  type GetEmailTemplateRequest,
  type GetEmailTemplateResponse,
  type CreateEmailTemplateRequest,
  type CreateEmailTemplateResponse,
  type UpdateEmailTemplateRequest,
  type UpdateEmailTemplateResponse,
  type DeleteEmailTemplateRequest,
  type DeleteEmailTemplateResponse,
  type PreviewEmailTemplateRequest,
  type PreviewEmailTemplateResponse,
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
  getNotification(
    req: GetNotificationRequest,
    metadata: Metadata
  ): Promise<GetNotificationResponse>;
  getUnreadCount(req: GetUnreadCountRequest, metadata: Metadata): Promise<GetUnreadCountResponse>;
  markAllRead(req: MarkAllReadRequest, metadata: Metadata): Promise<MarkAllReadResponse>;
  deleteNotification(
    req: DeleteNotificationRequest,
    metadata: Metadata
  ): Promise<DeleteNotificationResponse>;
  getNotificationPreferences(
    req: GetNotificationPreferencesRequest,
    metadata: Metadata
  ): Promise<GetNotificationPreferencesResponse>;
  updateNotificationPreferences(
    req: UpdateNotificationPreferencesRequest,
    metadata: Metadata
  ): Promise<UpdateNotificationPreferencesResponse>;
  resetNotificationPreferences(
    req: ResetNotificationPreferencesRequest,
    metadata: Metadata
  ): Promise<ResetNotificationPreferencesResponse>;
  cleanupExpiredNotifications(
    req: CleanupExpiredNotificationsRequest,
    metadata: Metadata
  ): Promise<CleanupExpiredNotificationsResponse>;
  listEmailTemplates(
    req: ListEmailTemplatesRequest,
    metadata: Metadata
  ): Promise<ListEmailTemplatesResponse>;
  getEmailTemplate(
    req: GetEmailTemplateRequest,
    metadata: Metadata
  ): Promise<GetEmailTemplateResponse>;
  createEmailTemplate(
    req: CreateEmailTemplateRequest,
    metadata: Metadata
  ): Promise<CreateEmailTemplateResponse>;
  updateEmailTemplate(
    req: UpdateEmailTemplateRequest,
    metadata: Metadata
  ): Promise<UpdateEmailTemplateResponse>;
  deleteEmailTemplate(
    req: DeleteEmailTemplateRequest,
    metadata: Metadata
  ): Promise<DeleteEmailTemplateResponse>;
  previewEmailTemplate(
    req: PreviewEmailTemplateRequest,
    metadata: Metadata
  ): Promise<PreviewEmailTemplateResponse>;
  broadcast(
    req: import('@adopt-dont-shop/proto').BroadcastRequest,
    metadata: Metadata
  ): Promise<import('@adopt-dont-shop/proto').BroadcastResponse>;
  close(): void;
};

export type CreateNotificationsClientOptions = {
  // grpc-js dial target. Plain `host:port` in dev (insecure, matches
  // service.notifications's `ServerCredentials.createInsecure()`); a
  // future deploy can swap in TLS via a different credentials choice
  // here.
  address: string;
};

// Default per-call deadline. Without one, a hung downstream service
// would hang the gateway request forever; 5s caps the blast radius
// and lets the caller fail fast with DEADLINE_EXCEEDED.
const DEFAULT_DEADLINE_MS = 5_000;

export const createNotificationsClient = (
  opts: CreateNotificationsClientOptions
): NotificationsClient => {
  const stub = new NotificationsV1.NotificationServiceClient(
    opts.address,
    credentials.createInsecure()
  );

  const callUnary = <Req, Res>(
    fn: (
      req: Req,
      metadata: Metadata,
      options: Partial<CallOptions>,
      cb: (err: unknown, res: Res) => void
    ) => unknown,
    req: Req,
    metadata: Metadata
  ): Promise<Res> =>
    new Promise<Res>((resolve, reject) => {
      const options: Partial<CallOptions> = {
        deadline: new Date(Date.now() + DEFAULT_DEADLINE_MS),
      };
      fn.call(stub, req, metadata, options, (err: unknown, res: Res) => {
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
    getNotification: (req, metadata) => callUnary(stub.getNotification, req, metadata),
    getUnreadCount: (req, metadata) => callUnary(stub.getUnreadCount, req, metadata),
    markAllRead: (req, metadata) => callUnary(stub.markAllRead, req, metadata),
    deleteNotification: (req, metadata) => callUnary(stub.deleteNotification, req, metadata),
    getNotificationPreferences: (req, metadata) =>
      callUnary(stub.getNotificationPreferences, req, metadata),
    updateNotificationPreferences: (req, metadata) =>
      callUnary(stub.updateNotificationPreferences, req, metadata),
    resetNotificationPreferences: (req, metadata) =>
      callUnary(stub.resetNotificationPreferences, req, metadata),
    cleanupExpiredNotifications: (req, metadata) =>
      callUnary(stub.cleanupExpiredNotifications, req, metadata),
    listEmailTemplates: (req, metadata) => callUnary(stub.listEmailTemplates, req, metadata),
    getEmailTemplate: (req, metadata) => callUnary(stub.getEmailTemplate, req, metadata),
    createEmailTemplate: (req, metadata) => callUnary(stub.createEmailTemplate, req, metadata),
    updateEmailTemplate: (req, metadata) => callUnary(stub.updateEmailTemplate, req, metadata),
    deleteEmailTemplate: (req, metadata) => callUnary(stub.deleteEmailTemplate, req, metadata),
    previewEmailTemplate: (req, metadata) => callUnary(stub.previewEmailTemplate, req, metadata),
    broadcast: (req, metadata) => callUnary(stub.broadcast, req, metadata),
    close: () => stub.close(),
  };
};
