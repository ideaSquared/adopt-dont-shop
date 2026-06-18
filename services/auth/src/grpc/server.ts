// gRPC server boot — registers AuthServiceService on a grpc.Server and
// delegates bind/shutdown to @adopt-dont-shop/service-bootstrap.

import { Server } from '@grpc/grpc-js';

import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';

import {
  startGrpcServer as startGrpcServerShared,
  type RunningGrpcServer,
} from '@adopt-dont-shop/service-bootstrap';

import { AuthV1 } from '@adopt-dont-shop/proto';

import type { AuthConfig } from '../config.js';

import { adapt, adaptUnauth } from './adapter.js';
import {
  changePassword,
  forgotPassword,
  provisionInvitedUser,
  register,
  resendVerification,
  resetPassword,
  updateAccount,
  verifyEmail,
} from './account-handlers.js';
import { disableTwoFactor, enableTwoFactor, setupTwoFactor } from './two-factor-handlers.js';
import {
  assignRole,
  getMe,
  login,
  logout,
  refreshToken,
  validateToken,
  type HandlerDeps,
} from './handlers.js';
import {
  adminGetUser,
  adminUpdateUser,
  bulkUpdateUsers,
  deactivateUser,
  getUserPermissions,
  getUserStatistics,
  listUserIdsByCohort,
  reactivateUser,
  searchUsers,
} from './admin-handlers.js';
import {
  bulkUpsertFieldPermissions,
  deleteFieldPermission,
  getFieldPermissionDefaults,
  getFieldPermissionDefaultsForRole,
  listFieldPermissionOverrides,
  listFieldPermissionOverridesForRole,
  upsertFieldPermission,
} from './field-permission-handlers.js';
import {
  getPrivacyPreferences,
  resetPrivacyPreferences,
  updatePrivacyPreferences,
} from './privacy-prefs-handlers.js';
import { listSessions, revokeSession } from './session-handlers.js';

export type CreateGrpcServerOptions = {
  config: AuthConfig;
  pool: Pool;
  nats: NatsConnection;
  passwordHasher: HandlerDeps['passwordHasher'];
  tokenIssuer: HandlerDeps['tokenIssuer'];
  logger: Logger;
};

export type { RunningGrpcServer };

export const createGrpcServer = (opts: CreateGrpcServerOptions): Server => {
  const { config, pool, nats, passwordHasher, tokenIssuer, logger } = opts;
  const deps: HandlerDeps = { pool, nats, passwordHasher, tokenIssuer };
  const server = new Server();

  server.addService(AuthV1.AuthServiceService, {
    // Token-minting / verification RPCs — no caller principal required.
    login: adaptUnauth(login, { deps, logger }),
    refreshToken: adaptUnauth(refreshToken, { deps, logger }),
    validateToken: adaptUnauth(validateToken, { deps, logger }),
    // Principal-required RPCs.
    logout: adapt(logout, { deps, logger }),
    getMe: adapt(getMe, { deps, logger }),
    assignRole: adapt(assignRole, { deps, logger }),
    // Account-lifecycle RPCs — unauthenticated entry points + two
    // principal-required ones (changePassword, updateAccount).
    register: adaptUnauth(register, { deps, logger }),
    // Service-internal create-or-find for invite acceptance — gated by
    // the gateway behind invitation-token validation, not a principal.
    provisionInvitedUser: adaptUnauth(provisionInvitedUser, { deps, logger }),
    verifyEmail: adaptUnauth(verifyEmail, { deps, logger }),
    resendVerification: adaptUnauth(resendVerification, { deps, logger }),
    forgotPassword: adaptUnauth(forgotPassword, { deps, logger }),
    resetPassword: adaptUnauth(resetPassword, { deps, logger }),
    changePassword: adapt(changePassword, { deps, logger }),
    setupTwoFactor: adapt(setupTwoFactor, { deps, logger }),
    enableTwoFactor: adapt(enableTwoFactor, { deps, logger }),
    disableTwoFactor: adapt(disableTwoFactor, { deps, logger }),
    updateAccount: adapt(updateAccount, { deps, logger }),
    // Session management — list active refresh-token chains + revoke.
    listSessions: adapt(listSessions, { deps, logger }),
    revokeSession: adapt(revokeSession, { deps, logger }),
    // Privacy preferences — 1:1 with users; gateway composes these with
    // notifications.user_notification_prefs for the unified API.
    getPrivacyPreferences: adapt(getPrivacyPreferences, { deps, logger }),
    updatePrivacyPreferences: adapt(updatePrivacyPreferences, { deps, logger }),
    resetPrivacyPreferences: adapt(resetPrivacyPreferences, { deps, logger }),
    // Admin user management — /api/v1/users/* admin surface.
    searchUsers: adapt(searchUsers, { deps, logger }),
    adminGetUser: adapt(adminGetUser, { deps, logger }),
    adminUpdateUser: adapt(adminUpdateUser, { deps, logger }),
    deactivateUser: adapt(deactivateUser, { deps, logger }),
    reactivateUser: adapt(reactivateUser, { deps, logger }),
    getUserStatistics: adapt(getUserStatistics, { deps, logger }),
    getUserPermissions: adapt(getUserPermissions, { deps, logger }),
    bulkUpdateUsers: adapt(bulkUpdateUsers, { deps, logger }),
    listUserIdsByCohort: adapt(listUserIdsByCohort, { deps, logger }),
    // Field-level permissions admin — /api/v1/field-permissions/*.
    getFieldPermissionDefaults: adapt(getFieldPermissionDefaults, { deps, logger }),
    getFieldPermissionDefaultsForRole: adapt(getFieldPermissionDefaultsForRole, { deps, logger }),
    listFieldPermissionOverrides: adapt(listFieldPermissionOverrides, { deps, logger }),
    listFieldPermissionOverridesForRole: adapt(listFieldPermissionOverridesForRole, {
      deps,
      logger,
    }),
    upsertFieldPermission: adapt(upsertFieldPermission, { deps, logger }),
    bulkUpsertFieldPermissions: adapt(bulkUpsertFieldPermissions, { deps, logger }),
    deleteFieldPermission: adapt(deleteFieldPermission, { deps, logger }),
  });

  logger.info('gRPC AuthService registered', {
    methods: [
      'login',
      'logout',
      'refreshToken',
      'validateToken',
      'getMe',
      'assignRole',
      'register',
      'provisionInvitedUser',
      'verifyEmail',
      'resendVerification',
      'forgotPassword',
      'resetPassword',
      'changePassword',
      'updateAccount',
      'listSessions',
      'revokeSession',
      'getPrivacyPreferences',
      'updatePrivacyPreferences',
      'resetPrivacyPreferences',
      'searchUsers',
      'adminGetUser',
      'adminUpdateUser',
      'deactivateUser',
      'reactivateUser',
      'getUserStatistics',
      'getUserPermissions',
      'bulkUpdateUsers',
      'listUserIdsByCohort',
      'getFieldPermissionDefaults',
      'getFieldPermissionDefaultsForRole',
      'listFieldPermissionOverrides',
      'listFieldPermissionOverridesForRole',
      'upsertFieldPermission',
      'bulkUpsertFieldPermissions',
      'deleteFieldPermission',
    ],
    grpcPort: config.grpcPort,
  });

  return server;
};

export const startGrpcServer = async (
  opts: CreateGrpcServerOptions
): Promise<RunningGrpcServer> => {
  const { config, logger } = opts;
  const server = createGrpcServer(opts);
  return startGrpcServerShared(server, config, logger);
};
