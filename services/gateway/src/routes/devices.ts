// REST → gRPC translation for /api/v1/devices/*.
//
// service.notifications owns device_tokens (PR #956). The monolith
// has exposed POST/GET/DELETE /api/v1/devices since before the
// extraction; this plugin reproduces the same SPA-facing shape so the
// cutover can flip CUTOVER_NOTIFICATIONS=true without the SPA noticing.
//
// Path shapes (monolith parity):
//   POST   /api/v1/devices              register
//   GET    /api/v1/devices              list-self
//   DELETE /api/v1/devices/:tokenId     unregister
//
// gRPC client is shared with the existing notifications routes
// (registerDeviceToken / unregisterDeviceToken / listDeviceTokens on
// NotificationsClient).

import { status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply } from 'fastify';

import {
  NotificationsV1,
  type ListDeviceTokensRequest,
  type RegisterDeviceTokenRequest,
  type UnregisterDeviceTokenRequest,
} from '@adopt-dont-shop/proto';

import type { NotificationsClient } from '../grpc-clients/notifications-client.js';
import { buildMetadata } from '../middleware/metadata.js';

export type DevicesRoutesOptions = {
  client: NotificationsClient;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.ALREADY_EXISTS]: 409,
  [status.INTERNAL]: 500,
};

const platformFromString = (raw: string | undefined): NotificationsV1.DevicePlatform => {
  switch (raw?.toLowerCase()) {
    case 'ios':
      return NotificationsV1.DevicePlatform.DEVICE_PLATFORM_IOS;
    case 'android':
      return NotificationsV1.DevicePlatform.DEVICE_PLATFORM_ANDROID;
    case 'web':
      return NotificationsV1.DevicePlatform.DEVICE_PLATFORM_WEB;
    default:
      return NotificationsV1.DevicePlatform.DEVICE_PLATFORM_UNSPECIFIED;
  }
};

export const registerDevicesRoutes = async (
  app: FastifyInstance,
  opts: DevicesRoutesOptions
): Promise<void> => {
  const { client } = opts;

  // POST /api/v1/devices — register / refresh a device token.
  app.post('/api/v1/devices', async (req, reply) => {
    const metadata = buildMetadata(req);
    const body = (req.body ?? {}) as {
      // Monolith accepts `token`; the proto field is `device_token`.
      // Accept both so the SPA can transition without coordinated
      // rename.
      token?: string;
      deviceToken?: string;
      device_token?: string;
      platform?: string;
      appVersion?: string;
      app_version?: string;
      deviceInfo?: Record<string, unknown>;
      device_info?: Record<string, unknown>;
    };

    const grpcReq: RegisterDeviceTokenRequest = {
      deviceToken: body.deviceToken ?? body.device_token ?? body.token ?? '',
      platform: platformFromString(body.platform),
      appVersion: body.appVersion ?? body.app_version,
      // Proto field carries the JSON-stringified payload; the chat /
      // notifications handler parses it back.
      deviceInfoJson: body.deviceInfo
        ? JSON.stringify(body.deviceInfo)
        : body.device_info
          ? JSON.stringify(body.device_info)
          : '',
    };

    try {
      const res = await client.registerDeviceToken(grpcReq, metadata);
      // 201 on fresh registration, 200 when an existing token was
      // refreshed — same convention chat.openChat uses.
      return reply
        .code(res.alreadyRegistered ? 200 : 201)
        .send(NotificationsV1.RegisterDeviceTokenResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // GET /api/v1/devices — list the calling principal's device tokens.
  app.get('/api/v1/devices', async (req, reply) => {
    const metadata = buildMetadata(req);
    const query = req.query as Record<string, string | undefined>;
    const grpcReq: ListDeviceTokensRequest = {
      includeInactive: query.includeInactive === 'true' || query.include_inactive === 'true',
    } as ListDeviceTokensRequest;

    try {
      const res = await client.listDeviceTokens(grpcReq, metadata);
      return reply.send(NotificationsV1.ListDeviceTokensResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // DELETE /api/v1/devices/:tokenId — soft-delete + revoke.
  app.delete<{ Params: { tokenId: string } }>('/api/v1/devices/:tokenId', async (req, reply) => {
    const metadata = buildMetadata(req);
    const grpcReq: UnregisterDeviceTokenRequest = { tokenId: req.params.tokenId };

    try {
      const res = await client.unregisterDeviceToken(grpcReq, metadata);
      return reply.send(NotificationsV1.UnregisterDeviceTokenResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });
};

// --- Helpers ---------------------------------------------------------

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}
