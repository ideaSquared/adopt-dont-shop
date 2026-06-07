// REST → gRPC translation for /api/v1/users/* — the SPA-facing user
// surface that the monolith served via UserController.
//
// This plugin spans TWO backend services:
//   - service.auth  — profile (GetMe / UpdateAccount RPCs) + privacy
//                     preferences (GetPrivacyPreferences /
//                     UpdatePrivacyPreferences / ResetPrivacyPreferences)
//   - service.notifications — the in-app channel preferences
//                     (GetNotificationPreferences /
//                     UpdateNotificationPreferences /
//                     ResetNotificationPreferences) that the monolith's
//                     /preferences endpoint composes into a single
//                     response shape.
//
// The monolith's UserPreferences DTO is the union of the two underlying
// rows. We preserve that contract here so the SPA's lib.api client
// keeps working without a re-spin.

import { Metadata, status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  AuthV1,
  NotificationsV1,
  type GetMeRequest,
  type GetPrivacyPreferencesRequest,
  type ResetPrivacyPreferencesRequest,
  type UpdateAccountRequest,
  type UpdateNotificationPreferencesRequest,
  type UpdatePrivacyPreferencesRequest,
} from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { NotificationsClient } from '../grpc-clients/notifications-client.js';

export type UsersRoutesOptions = {
  authClient: AuthClient;
  notificationsClient: NotificationsClient;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.INTERNAL]: 500,
};

const visibilityProtoToString = (v: AuthV1.ProfileVisibility): string => {
  switch (v) {
    case AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PUBLIC:
      return 'public';
    case AuthV1.ProfileVisibility.PROFILE_VISIBILITY_RESCUES_ONLY:
      return 'rescues_only';
    case AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PRIVATE:
      return 'private';
    default:
      return 'rescues_only';
  }
};

const visibilityStringToProto = (raw: string | undefined): AuthV1.ProfileVisibility => {
  if (!raw) return AuthV1.ProfileVisibility.PROFILE_VISIBILITY_UNSPECIFIED;
  switch (raw) {
    case 'public':
      return AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PUBLIC;
    case 'rescues_only':
    case 'friends': // monolith legacy synonym
      return AuthV1.ProfileVisibility.PROFILE_VISIBILITY_RESCUES_ONLY;
    case 'private':
      return AuthV1.ProfileVisibility.PROFILE_VISIBILITY_PRIVATE;
    default:
      return AuthV1.ProfileVisibility.PROFILE_VISIBILITY_UNSPECIFIED;
  }
};

// Combine the two backing-service responses into the monolith's
// UserPreferences shape.
const composePreferences = (
  notif: NotificationsV1.NotificationPreferences,
  privacy: AuthV1.PrivacyPreferences
): Record<string, unknown> => ({
  emailNotifications: notif.emailEnabled,
  pushNotifications: notif.pushEnabled,
  smsNotifications: notif.smsEnabled,
  privacySettings: {
    profileVisibility: visibilityProtoToString(privacy.profileVisibility),
    showLocation: privacy.showLocation,
    showContactInfo: false,
  },
});

const buildNotifPatch = (body: Record<string, unknown>): UpdateNotificationPreferencesRequest => {
  const out: UpdateNotificationPreferencesRequest = {
    digestFrequency:
      NotificationsV1.NotificationDigestFrequency.NOTIFICATION_DIGEST_FREQUENCY_UNSPECIFIED,
  };
  if (typeof body.emailNotifications === 'boolean') {
    out.emailEnabled = body.emailNotifications;
  }
  if (typeof body.pushNotifications === 'boolean') {
    out.pushEnabled = body.pushNotifications;
  }
  if (typeof body.smsNotifications === 'boolean') {
    out.smsEnabled = body.smsNotifications;
  }
  return out;
};

const buildPrivacyPatch = (body: Record<string, unknown>): UpdatePrivacyPreferencesRequest => {
  const out: UpdatePrivacyPreferencesRequest = {
    profileVisibility: AuthV1.ProfileVisibility.PROFILE_VISIBILITY_UNSPECIFIED,
  };
  const privacy = body.privacySettings as Record<string, unknown> | undefined;
  if (privacy) {
    if (typeof privacy.profileVisibility === 'string') {
      out.profileVisibility = visibilityStringToProto(privacy.profileVisibility);
    }
    if (typeof privacy.showLocation === 'boolean') {
      out.showLocation = privacy.showLocation;
    }
  }
  return out;
};

export const registerUsersRoutes = async (
  app: FastifyInstance,
  opts: UsersRoutesOptions
): Promise<void> => {
  const { authClient, notificationsClient } = opts;

  // --- GET /api/v1/users/profile -------------------------------------
  // The monolith mounts both /profile and /account for the same payload.
  // The /account routes already live in routes/auth.ts; we add /profile
  // here so lib.api's user.getProfile() call lands on a single seam.
  app.get('/api/v1/users/profile', async (req, reply) => {
    const metadata = buildMetadata(req);
    try {
      const res = await authClient.getMe({} as GetMeRequest, metadata);
      return reply.send(AuthV1.GetMeResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.put('/api/v1/users/profile', async (req, reply) => {
    const metadata = buildMetadata(req);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const str = (k1: string, k2?: string): string | undefined => {
      const v = (b[k1] ?? (k2 ? b[k2] : undefined)) as unknown;
      return typeof v === 'string' ? v : undefined;
    };
    const grpcReq: UpdateAccountRequest = {
      firstName: str('firstName', 'first_name'),
      lastName: str('lastName', 'last_name'),
      phoneNumber: str('phoneNumber', 'phone_number'),
      bio: str('bio'),
      timezone: str('timezone'),
      language: str('language'),
      country: str('country'),
      city: str('city'),
      addressLine1: str('addressLine1', 'address_line_1'),
      addressLine2: str('addressLine2', 'address_line_2'),
      postalCode: str('postalCode', 'postal_code'),
    };
    try {
      const res = await authClient.updateAccount(grpcReq, metadata);
      return reply.send(AuthV1.UpdateAccountResponse.toJSON(res));
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // --- GET /api/v1/users/preferences --------------------------------
  // Fetches both backing rows in parallel and composes.
  app.get('/api/v1/users/preferences', async (req, reply) => {
    const metadata = buildMetadata(req);
    try {
      const [notif, privacy] = await Promise.all([
        notificationsClient.getNotificationPreferences({}, metadata),
        authClient.getPrivacyPreferences({} as GetPrivacyPreferencesRequest, metadata),
      ]);
      return reply.send({
        success: true,
        data: composePreferences(notif.preferences!, privacy.preferences!),
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // --- PUT /api/v1/users/preferences --------------------------------
  // Splits the unified body across the two backing RPCs. Either patch
  // may be empty (no fields supplied for that slice) — the underlying
  // handlers no-op on an empty patch and return the current row, which
  // we then re-compose into the unified response.
  app.put('/api/v1/users/preferences', async (req, reply) => {
    const metadata = buildMetadata(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    try {
      const [notif, privacy] = await Promise.all([
        notificationsClient.updateNotificationPreferences(buildNotifPatch(body), metadata),
        authClient.updatePrivacyPreferences(buildPrivacyPatch(body), metadata),
      ]);
      return reply.send({
        success: true,
        message: 'Preferences updated successfully',
        data: composePreferences(notif.preferences!, privacy.preferences!),
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // --- POST /api/v1/users/preferences/reset -------------------------
  // Destroy + recreate both backing rows so the table-level defaults
  // win. The monolith returns the fresh defaults in the response body.
  app.post('/api/v1/users/preferences/reset', async (req, reply) => {
    const metadata = buildMetadata(req);
    try {
      const [notif, privacy] = await Promise.all([
        notificationsClient.resetNotificationPreferences({}, metadata),
        authClient.resetPrivacyPreferences({} as ResetPrivacyPreferencesRequest, metadata),
      ]);
      return reply.send({
        success: true,
        message: 'Preferences reset to defaults',
        data: composePreferences(notif.preferences!, privacy.preferences!),
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });
};

// --- Helpers ---------------------------------------------------------

function buildMetadata(req: FastifyRequest): Metadata {
  const m = new Metadata();
  const headers = req.headers as Record<string, string | string[] | undefined>;
  for (const key of ['x-user-id', 'x-user-roles', 'x-user-permissions', 'x-rescue-id']) {
    const raw = headers[key];
    if (typeof raw === 'string' && raw.length > 0) {
      m.set(key, raw);
    }
  }
  return m;
}

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    success: false,
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}
