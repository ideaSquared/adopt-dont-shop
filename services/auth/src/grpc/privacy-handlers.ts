// gRPC handlers for the admin Privacy Tools surface (GDPR Art. 20 / 17):
// ExportUserData + RequestAccountDeletion.
//
// Auth-scoped: these only touch auth-owned data (the user profile + the
// privacy-preferences row). Cross-service aggregation (pets / applications
// / chats) is deliberately out of scope. The deletion path schedules + locks
// the account and stops at a published event — the hard-anonymisation job is
// downstream (no consumer yet).

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import type { Permission } from '@adopt-dont-shop/lib.types';

import {
  type ExportUserDataRequest,
  type ExportUserDataResponse,
  type RequestAccountDeletionRequest,
  type RequestAccountDeletionResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, rowToProtoUser, type HandlerDeps, type UserRow } from './handlers.js';
import { privacyPrefsRowToProto, type PrivacyPrefsRow } from './privacy-prefs-handlers.js';

// --- Permissions -----------------------------------------------------

const ADMIN_DATA_EXPORT: Permission = 'admin.data.export' as Permission;
const USERS_DELETE: Permission = 'users.delete' as Permission;

// Grace window before a scheduled account is hard-anonymised (GDPR Art. 17).
const DELETION_GRACE_DAYS = 30;

// Same column set rowToProtoUser reads (mirrors admin-handlers' USER_SELECT).
const USER_SELECT = `
  user_id, email, password, first_name, last_name, email_verified,
  phone_verified, two_factor_enabled, status, user_type,
  profile_image_url, bio, timezone, language, country, city,
  last_login_at, locked_until, login_attempts, created_at, updated_at
`;

// --- ExportUserData --------------------------------------------------

export async function exportUserData(
  deps: HandlerDeps,
  principal: Principal,
  req: ExportUserDataRequest
): Promise<ExportUserDataResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!hasPermission(principal, ADMIN_DATA_EXPORT)) {
    throw new HandlerError('PERMISSION_DENIED', `'${ADMIN_DATA_EXPORT}' required`);
  }

  const userRes = await deps.pool.query<UserRow>(
    `SELECT ${USER_SELECT} FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [req.userId]
  );
  const userRow = userRes.rows[0];
  if (!userRow) {
    throw new HandlerError('NOT_FOUND', `user ${req.userId} not found`);
  }

  // Read-only — unlike GetPrivacyPreferences this never auto-creates a row;
  // a user who never touched their preferences simply has none to export.
  const prefsRes = await deps.pool.query<PrivacyPrefsRow>(
    `SELECT * FROM user_privacy_prefs WHERE user_id = $1`,
    [req.userId]
  );
  const prefsRow = prefsRes.rows[0];

  return {
    user: rowToProtoUser(userRow),
    privacyPreferences: prefsRow ? privacyPrefsRowToProto(prefsRow) : undefined,
    exportedAt: new Date().toISOString(),
  };
}

// --- RequestAccountDeletion ------------------------------------------

export async function requestAccountDeletion(
  deps: HandlerDeps,
  principal: Principal,
  req: RequestAccountDeletionRequest
): Promise<RequestAccountDeletionResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }
  if (!hasPermission(principal, USERS_DELETE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${USERS_DELETE}' required`);
  }
  if (req.userId === principal.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'cannot schedule deletion of your own account');
  }

  const current = await deps.pool.query<{ deletion_scheduled_at: Date | null }>(
    `SELECT deletion_scheduled_at FROM auth.users WHERE user_id = $1 AND deleted_at IS NULL`,
    [req.userId]
  );
  if (current.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `user ${req.userId} not found`);
  }
  // Idempotent — already scheduled. Return the existing date without
  // re-deactivating or re-publishing.
  const already = current.rows[0].deletion_scheduled_at;
  if (already) {
    return { deletionScheduledFor: already.toISOString() };
  }

  const scheduledFor = new Date(Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);

  await withTransaction(deps, async ({ client, publish }) => {
    // Deactivate (gates future logins via ValidateToken's status check) +
    // stamp the grace deadline + invalidate outstanding access tokens.
    await client.query(
      `
      UPDATE auth.users
      SET status = 'deactivated', deletion_scheduled_at = $2,
          tokens_valid_from = now(), updated_at = now(), version = version + 1
      WHERE user_id = $1 AND deleted_at IS NULL
      `,
      [req.userId, scheduledFor]
    );

    publish({
      type: 'auth.accountDeletionRequested',
      id: `auth.accountDeletionRequested.${req.userId}.${Date.now()}`,
      payload: {
        userId: req.userId,
        requestedBy: principal.userId,
        reason: req.reason ?? null,
        scheduledFor: scheduledFor.toISOString(),
      },
    });
  });

  return { deletionScheduledFor: scheduledFor.toISOString() };
}
