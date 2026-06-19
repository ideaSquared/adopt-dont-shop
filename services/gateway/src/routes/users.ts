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

import type { FastifyInstance } from 'fastify';

import {
  AuthV1,
  NotificationsV1,
  type AdminUpdateUserRequest,
  type GetMeRequest,
  type GetPrivacyPreferencesRequest,
  type ResetPrivacyPreferencesRequest,
  type SearchUsersRequest,
  type UpdateAccountRequest,
  type UpdateNotificationPreferencesRequest,
  type UpdatePrivacyPreferencesRequest,
} from '@adopt-dont-shop/proto';

import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { NotificationsClient } from '../grpc-clients/notifications-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';
import { userToApiJson } from './auth-user-json.js';

export type UsersRoutesOptions = {
  authClient: AuthClient;
  notificationsClient: NotificationsClient;
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
  if (!raw) {
    return AuthV1.ProfileVisibility.PROFILE_VISIBILITY_UNSPECIFIED;
  }
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
  app.get(
    '/api/v1/users/profile',
    {
      schema: {
        tags: ['users'],
        summary: 'Get current user profile',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      try {
        const res = await authClient.getMe({} as GetMeRequest, metadata);
        return reply.send(AuthV1.GetMeResponse.toJSON(res));
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.put(
    '/api/v1/users/profile',
    {
      schema: {
        tags: ['users'],
        summary: 'Update current user profile',
      },
    },
    async (req, reply) => {
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
    }
  );

  // --- GET /api/v1/users/preferences --------------------------------
  // Fetches both backing rows in parallel and composes.
  app.get(
    '/api/v1/users/preferences',
    {
      schema: {
        tags: ['users'],
        summary: 'Get current user preferences',
      },
    },
    async (req, reply) => {
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
    }
  );

  // --- PUT /api/v1/users/preferences --------------------------------
  // Splits the unified body across the two backing RPCs. Either patch
  // may be empty (no fields supplied for that slice) — the underlying
  // handlers no-op on an empty patch and return the current row, which
  // we then re-compose into the unified response.
  app.put(
    '/api/v1/users/preferences',
    {
      schema: {
        tags: ['users'],
        summary: 'Update current user preferences',
      },
    },
    async (req, reply) => {
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
    }
  );

  // --- POST /api/v1/users/preferences/reset -------------------------
  // Destroy + recreate both backing rows so the table-level defaults
  // win. The monolith returns the fresh defaults in the response body.
  app.post(
    '/api/v1/users/preferences/reset',
    {
      schema: {
        tags: ['users'],
        summary: 'Reset current user preferences to defaults',
      },
    },
    async (req, reply) => {
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
    }
  );

  // --- Admin user management ----------------------------------------
  // These register AFTER /profile + /preferences (static segments win
  // Fastify's matcher) but BEFORE the dynamic GET /:userId below.

  // GET /api/v1/users/search
  app.get(
    '/api/v1/users/search',
    {
      schema: {
        tags: ['users'],
        summary: 'Search users (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ success: false, error: pagination.error });
      }
      const grpcReq: SearchUsersRequest = {
        search: q.search,
        statusFilter: statusFilterFromString(q.status),
        userTypeFilter: userTypeFilterFromString(q.userType ?? q.user_type),
        emailVerified: q.emailVerified ? q.emailVerified === 'true' : undefined,
        createdFrom: q.createdFrom ?? q.created_from,
        createdTo: q.createdTo ?? q.created_to,
        page: pagination.page,
        limit: pagination.limit,
        sortBy: q.sortBy ?? q.sort_by,
        sortOrder: q.sortOrder ?? q.sort_order,
      };
      try {
        const res = await authClient.searchUsers(grpcReq, metadata);
        return reply.send({
          success: true,
          data: res.users.map(u => AuthV1.User.toJSON(u)),
          pagination: {
            page: res.page,
            limit: grpcReq.limit || 20,
            total: res.total,
            totalPages: res.totalPages,
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/users/statistics
  app.get(
    '/api/v1/users/statistics',
    {
      schema: {
        tags: ['users'],
        summary: 'Get user statistics (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      try {
        const res = await authClient.getUserStatistics({}, metadata);
        return reply.send({
          success: true,
          data: AuthV1.GetUserStatisticsResponse.toJSON(res),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/users/:userId
  app.get<{ Params: { userId: string } }>(
    '/api/v1/users/:userId',
    {
      schema: {
        tags: ['users'],
        summary: 'Get a user by ID (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      try {
        const res = await authClient.adminGetUser({ userId: req.params.userId }, metadata);
        return reply.send({ success: true, data: AuthV1.User.toJSON(res.user!) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // PUT /api/v1/users/:userId — admin update.
  app.put<{ Params: { userId: string } }>(
    '/api/v1/users/:userId',
    {
      schema: {
        tags: ['users'],
        summary: 'Update a user (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: AdminUpdateUserRequest = {
        userId: req.params.userId,
        status: statusFilterFromString(typeof body.status === 'string' ? body.status : undefined),
        userType: userTypeFilterFromString(
          typeof body.userType === 'string'
            ? body.userType
            : typeof body.user_type === 'string'
              ? body.user_type
              : undefined
        ),
        emailVerified: typeof body.emailVerified === 'boolean' ? body.emailVerified : undefined,
        firstName: typeof body.firstName === 'string' ? body.firstName : undefined,
        lastName: typeof body.lastName === 'string' ? body.lastName : undefined,
      };
      try {
        const res = await authClient.adminUpdateUser(grpcReq, metadata);
        return reply.send({ success: true, data: AuthV1.User.toJSON(res.user!) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/users/:userId/deactivate
  app.post<{ Params: { userId: string } }>(
    '/api/v1/users/:userId/deactivate',
    {
      schema: {
        tags: ['users'],
        summary: 'Deactivate a user (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const body = (req.body ?? {}) as { reason?: string };
      try {
        const res = await authClient.deactivateUser(
          { userId: req.params.userId, reason: body.reason },
          metadata
        );
        return reply.send({
          success: true,
          message: 'User deactivated',
          data: AuthV1.User.toJSON(res.user!),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/users/:userId/reactivate
  app.post<{ Params: { userId: string } }>(
    '/api/v1/users/:userId/reactivate',
    {
      schema: {
        tags: ['users'],
        summary: 'Reactivate a user (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      try {
        const res = await authClient.reactivateUser({ userId: req.params.userId }, metadata);
        return reply.send({
          success: true,
          message: 'User reactivated',
          data: AuthV1.User.toJSON(res.user!),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // ---- Admin user surface: /api/v1/admin/users/* -------------------
  // The admin SPA (and the e2e bulk-action flow) address users under an
  // /admin/users prefix. These map onto the same auth RPCs as the
  // /users/:userId admin routes above, but serialise via userToApiJson so
  // userType/status come back as the canonical strings the admin UI reads
  // ('admin', 'suspended') rather than the proto SCREAMING_SNAKE names.

  // GET /api/v1/admin/users — list/search.
  app.get(
    '/api/v1/admin/users',
    {
      schema: {
        tags: ['users'],
        summary: 'List or search users (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q, { limit: 0 });
      if (!pagination.ok) {
        return reply.code(400).send({ success: false, error: pagination.error });
      }
      const grpcReq: SearchUsersRequest = {
        search: q.search,
        statusFilter: statusFilterFromString(q.status),
        userTypeFilter: userTypeFilterFromString(q.userType ?? q.user_type),
        emailVerified: q.emailVerified ? q.emailVerified === 'true' : undefined,
        createdFrom: q.createdFrom ?? q.created_from,
        createdTo: q.createdTo ?? q.created_to,
        page: pagination.page,
        limit: pagination.limit,
        sortBy: q.sortBy ?? q.sort_by,
        sortOrder: q.sortOrder ?? q.sort_order,
      };
      try {
        const res = await authClient.searchUsers(grpcReq, metadata);
        return reply.send({
          success: true,
          data: res.users.map(userToApiJson),
          pagination: {
            page: res.page,
            limit: grpcReq.limit || 20,
            total: res.total,
            totalPages: res.totalPages,
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/admin/users/:userId — single user detail.
  app.get<{ Params: { userId: string } }>(
    '/api/v1/admin/users/:userId',
    {
      schema: {
        tags: ['users'],
        summary: 'Get a user by ID (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      try {
        const res = await authClient.adminGetUser({ userId: req.params.userId }, metadata);
        return reply.send({ success: true, data: userToApiJson(res.user!) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // PATCH /api/v1/admin/users/:userId/action — the per-user moderation
  // action the admin UI's bulk button calls once per row. Maps a small
  // action vocabulary onto the existing admin RPCs.
  app.patch<{ Params: { userId: string } }>(
    '/api/v1/admin/users/:userId/action',
    {
      schema: {
        tags: ['users'],
        summary: 'Apply a moderation action to a user (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const body = (req.body ?? {}) as { action?: string };
      try {
        if (body.action === 'suspend') {
          const grpcReq: AdminUpdateUserRequest = {
            userId: req.params.userId,
            status: AuthV1.UserStatus.USER_STATUS_SUSPENDED,
            userType: AuthV1.UserRole.USER_ROLE_UNSPECIFIED,
            emailVerified: undefined,
            firstName: undefined,
            lastName: undefined,
          };
          const res = await authClient.adminUpdateUser(grpcReq, metadata);
          return reply.send({ success: true, data: userToApiJson(res.user!) });
        }
        if (body.action === 'reactivate') {
          const res = await authClient.reactivateUser({ userId: req.params.userId }, metadata);
          return reply.send({ success: true, data: userToApiJson(res.user!) });
        }
        return reply
          .code(400)
          .send({ success: false, error: `unknown action: ${body.action ?? ''}` });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/admin/users/:userId/reset-password — admin-initiated
  // password reset. Returns the plaintext temporary password for the
  // admin to relay; the user changes it on next sign-in.
  app.post<{ Params: { userId: string } }>(
    '/api/v1/admin/users/:userId/reset-password',
    {
      schema: {
        tags: ['users'],
        summary: 'Reset a user password and return a temporary one (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      try {
        const res = await authClient.adminResetPassword({ userId: req.params.userId }, metadata);
        return reply.send({ temporary_password: res.temporaryPassword });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/users/bulk-update — admin bulk status/role change.
  // POST so it never collides with the GET/PUT /:userId dynamic routes.
  app.post(
    '/api/v1/users/bulk-update',
    {
      schema: {
        tags: ['users'],
        summary: 'Bulk update user status or role (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const body = (req.body ?? {}) as {
        userIds?: string[];
        user_ids?: string[];
        status?: string;
        userType?: string;
        user_type?: string;
        reason?: string;
      };
      try {
        const res = await authClient.bulkUpdateUsers(
          {
            userIds: body.userIds ?? body.user_ids ?? [],
            status: statusFilterFromString(body.status),
            userType: userTypeFilterFromString(body.userType ?? body.user_type),
            reason: body.reason,
          },
          metadata
        );
        return reply.send({
          success: true,
          message: `Updated ${res.successCount} user(s), ${res.failedCount} failed`,
          data: AuthV1.BulkUpdateUsersResponse.toJSON(res),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/users/:userId/permissions
  app.get<{ Params: { userId: string } }>(
    '/api/v1/users/:userId/permissions',
    {
      schema: {
        tags: ['users'],
        summary: 'Get permissions for a user',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      try {
        const res = await authClient.getUserPermissions({ userId: req.params.userId }, metadata);
        return reply.send({ success: true, data: { permissions: res.permissions } });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/users/:userId/with-permissions — composes the admin user
  // row + their flattened permission set in one round trip.
  app.get<{ Params: { userId: string } }>(
    '/api/v1/users/:userId/with-permissions',
    {
      schema: {
        tags: ['users'],
        summary: 'Get a user with their permissions',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      try {
        const [user, perms] = await Promise.all([
          authClient.adminGetUser({ userId: req.params.userId }, metadata),
          authClient.getUserPermissions({ userId: req.params.userId }, metadata),
        ]);
        return reply.send({
          success: true,
          data: {
            ...(AuthV1.User.toJSON(user.user!) as Record<string, unknown>),
            permissions: perms.permissions,
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // PUT /api/v1/users/:userId/role — change a single user's user_type.
  // Reuses AdminUpdateUser with only the user_type field set.
  app.put<{ Params: { userId: string } }>(
    '/api/v1/users/:userId/role',
    {
      schema: {
        tags: ['users'],
        summary: 'Update a user role (admin)',
      },
    },
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const body = (req.body ?? {}) as { role?: string; userType?: string; user_type?: string };
      const grpcReq: AdminUpdateUserRequest = {
        userId: req.params.userId,
        status: AuthV1.UserStatus.USER_STATUS_UNSPECIFIED,
        userType: userTypeFilterFromString(body.role ?? body.userType ?? body.user_type),
      };
      try {
        const res = await authClient.adminUpdateUser(grpcReq, metadata);
        return reply.send({
          success: true,
          message: 'User role updated',
          data: AuthV1.User.toJSON(res.user!),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Enum parsing helpers --------------------------------------------

function statusFilterFromString(raw: string | undefined): AuthV1.UserStatus {
  if (!raw) {
    return AuthV1.UserStatus.USER_STATUS_UNSPECIFIED;
  }
  const upper = `USER_STATUS_${raw.toUpperCase()}`;
  const parsed = AuthV1.userStatusFromJSON(
    Object.values(AuthV1.UserStatus).includes(upper as never) ? upper : raw
  );
  return parsed === AuthV1.UserStatus.UNRECOGNIZED
    ? AuthV1.UserStatus.USER_STATUS_UNSPECIFIED
    : parsed;
}

function userTypeFilterFromString(raw: string | undefined): AuthV1.UserRole {
  if (!raw) {
    return AuthV1.UserRole.USER_ROLE_UNSPECIFIED;
  }
  const upper = `USER_ROLE_${raw.toUpperCase()}`;
  const parsed = AuthV1.userRoleFromJSON(
    Object.values(AuthV1.UserRole).includes(upper as never) ? upper : raw
  );
  return parsed === AuthV1.UserRole.UNRECOGNIZED ? AuthV1.UserRole.USER_ROLE_UNSPECIFIED : parsed;
}

// --- Helpers ---------------------------------------------------------
