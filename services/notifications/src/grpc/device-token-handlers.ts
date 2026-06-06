// gRPC handlers for the device-token surface: RegisterDeviceToken,
// UnregisterDeviceToken, ListDeviceTokens.
//
// No NATS events for now — the push worker reads device_tokens on
// demand when fanning a notification out. Future enhancement: publish
// `notifications.device_token.registered` so analytics can count
// active push installs.

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import type { WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Permission } from '@adopt-dont-shop/lib.types';
import {
  NotificationsV1,
  type ListDeviceTokensRequest,
  type ListDeviceTokensResponse,
  type NotificationsDeviceToken,
  type RegisterDeviceTokenRequest,
  type RegisterDeviceTokenResponse,
  type UnregisterDeviceTokenRequest,
  type UnregisterDeviceTokenResponse,
} from '@adopt-dont-shop/proto';

import {
  getDeviceTokenById,
  listDeviceTokensForUser,
  registerDeviceToken,
  unregisterDeviceToken,
  type DeviceTokenRow,
} from '../push/device-tokens.js';
import type { DevicePlatform } from '../push/types.js';

import { HandlerError } from './handlers.js';

// --- Permissions -----------------------------------------------------

const DEVICE_TOKENS_WRITE_SELF: Permission = 'notifications.device-tokens.write' as Permission;
const DEVICE_TOKENS_WRITE_ANY: Permission = 'notifications.device-tokens.write:any' as Permission;
const DEVICE_TOKENS_READ_SELF: Permission = 'notifications.device-tokens.read' as Permission;
const DEVICE_TOKENS_READ_ANY: Permission = 'notifications.device-tokens.read:any' as Permission;

// --- Enum maps -------------------------------------------------------

const protoToPlatform: Record<NotificationsV1.DevicePlatform, DevicePlatform> = {
  [NotificationsV1.DevicePlatform.DEVICE_PLATFORM_UNSPECIFIED]: 'web',
  [NotificationsV1.DevicePlatform.DEVICE_PLATFORM_IOS]: 'ios',
  [NotificationsV1.DevicePlatform.DEVICE_PLATFORM_ANDROID]: 'android',
  [NotificationsV1.DevicePlatform.DEVICE_PLATFORM_WEB]: 'web',
  [NotificationsV1.DevicePlatform.UNRECOGNIZED]: 'web',
};

const platformToProto = (v: DevicePlatform): NotificationsV1.DevicePlatform => {
  switch (v) {
    case 'ios':
      return NotificationsV1.DevicePlatform.DEVICE_PLATFORM_IOS;
    case 'android':
      return NotificationsV1.DevicePlatform.DEVICE_PLATFORM_ANDROID;
    case 'web':
      return NotificationsV1.DevicePlatform.DEVICE_PLATFORM_WEB;
  }
};

const statusToProto = (
  v: 'active' | 'inactive' | 'expired' | 'invalid'
): NotificationsV1.DeviceTokenStatus => {
  switch (v) {
    case 'active':
      return NotificationsV1.DeviceTokenStatus.DEVICE_TOKEN_STATUS_ACTIVE;
    case 'inactive':
      return NotificationsV1.DeviceTokenStatus.DEVICE_TOKEN_STATUS_INACTIVE;
    case 'expired':
      return NotificationsV1.DeviceTokenStatus.DEVICE_TOKEN_STATUS_EXPIRED;
    case 'invalid':
      return NotificationsV1.DeviceTokenStatus.DEVICE_TOKEN_STATUS_INVALID;
  }
};

const rowToProto = (row: DeviceTokenRow): NotificationsDeviceToken => ({
  tokenId: row.token_id,
  userId: row.user_id,
  deviceToken: row.device_token,
  platform: platformToProto(row.platform),
  appVersion: row.app_version ?? undefined,
  deviceInfoJson: JSON.stringify(row.device_info),
  status: statusToProto(row.status),
  lastUsedAt: row.last_used_at?.toISOString(),
  expiresAt: row.expires_at?.toISOString(),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

// Cross-user write / read gating shared with email-handlers.
const resolveTargetUserId = (
  principal: Principal,
  requested: string | undefined,
  selfPerm: Permission,
  anyPerm: Permission
): string => {
  if (!hasPermission(principal, selfPerm)) {
    throw new HandlerError('PERMISSION_DENIED', `'${selfPerm}' required`);
  }
  const target = requested || (principal.userId as string);
  if (target === principal.userId) {
    return target;
  }
  if (!hasPermission(principal, anyPerm)) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${anyPerm}' required to access another user's device tokens`
    );
  }
  return target;
};

export type DeviceTokenDeps = WithTransactionDeps;

// --- RegisterDeviceToken ---------------------------------------------

export async function registerDeviceTokenHandler(
  deps: DeviceTokenDeps,
  principal: Principal,
  req: RegisterDeviceTokenRequest
): Promise<RegisterDeviceTokenResponse> {
  if (!req.deviceToken) {
    throw new HandlerError('INVALID_ARGUMENT', 'device_token is required');
  }
  if (req.platform === NotificationsV1.DevicePlatform.DEVICE_PLATFORM_UNSPECIFIED) {
    throw new HandlerError('INVALID_ARGUMENT', 'platform is required');
  }
  const userId = resolveTargetUserId(
    principal,
    req.userId,
    DEVICE_TOKENS_WRITE_SELF,
    DEVICE_TOKENS_WRITE_ANY
  );

  let deviceInfo: Record<string, unknown> | undefined;
  if (req.deviceInfoJson) {
    try {
      const parsed = JSON.parse(req.deviceInfoJson) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new HandlerError('INVALID_ARGUMENT', 'device_info_json must encode an object');
      }
      deviceInfo = parsed as Record<string, unknown>;
    } catch (err) {
      if (err instanceof HandlerError) {
        throw err;
      }
      throw new HandlerError('INVALID_ARGUMENT', 'device_info_json could not be parsed');
    }
  }

  const { row, alreadyRegistered } = await registerDeviceToken(deps.pool, {
    userId,
    deviceToken: req.deviceToken,
    platform: protoToPlatform[req.platform],
    appVersion: req.appVersion ?? null,
    deviceInfo,
  });

  return { token: rowToProto(row), alreadyRegistered };
}

// --- UnregisterDeviceToken -------------------------------------------

export async function unregisterDeviceTokenHandler(
  deps: DeviceTokenDeps,
  principal: Principal,
  req: UnregisterDeviceTokenRequest
): Promise<UnregisterDeviceTokenResponse> {
  if (!req.tokenId) {
    throw new HandlerError('INVALID_ARGUMENT', 'token_id is required');
  }
  if (!hasPermission(principal, DEVICE_TOKENS_WRITE_SELF)) {
    throw new HandlerError('PERMISSION_DENIED', `'${DEVICE_TOKENS_WRITE_SELF}' required`);
  }
  const existing = await getDeviceTokenById(deps.pool, req.tokenId);
  if (!existing) {
    throw new HandlerError('NOT_FOUND', `device token '${req.tokenId}' not found`);
  }
  // Self-scope unless the principal has :any.
  if (existing.user_id !== principal.userId && !hasPermission(principal, DEVICE_TOKENS_WRITE_ANY)) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${DEVICE_TOKENS_WRITE_ANY}' required to unregister another user's device token`
    );
  }
  const updated = await unregisterDeviceToken(deps.pool, req.tokenId);
  if (!updated) {
    throw new HandlerError('NOT_FOUND', `device token '${req.tokenId}' not found`);
  }
  return { token: rowToProto(updated) };
}

// --- ListDeviceTokens ------------------------------------------------

export async function listDeviceTokensHandler(
  deps: DeviceTokenDeps,
  principal: Principal,
  req: ListDeviceTokensRequest
): Promise<ListDeviceTokensResponse> {
  const userId = resolveTargetUserId(
    principal,
    req.userId,
    DEVICE_TOKENS_READ_SELF,
    DEVICE_TOKENS_READ_ANY
  );
  const rows = await listDeviceTokensForUser(deps.pool, userId, req.includeInactive);
  return { tokens: rows.map(rowToProto) };
}
