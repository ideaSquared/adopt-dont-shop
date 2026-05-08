import crypto from 'crypto';
import Application from '../models/Application';
import ChatParticipant from '../models/ChatParticipant';
import RefreshToken from '../models/RefreshToken';
import User, { UserStatus } from '../models/User';
import UserFavorite from '../models/UserFavorite';
import { AuditLogService } from './auditLog.service';
import { redactEmail } from './redact';
import { logger } from '../utils/logger';

/**
 * ADS-427: GDPR Article 17 (right to erasure).
 *
 * Two-phase deletion that matches docs/PRIVACY.md:
 *
 *   Phase 1 — soft-delete + revoke (immediate, this function)
 *     • Sequelize `paranoid: true` `destroy()` on the User row sets
 *       deleted_at; the row is no longer returned by default scopes.
 *     • All RefreshTokens are revoked so any active sessions die at
 *       next refresh. We do not blacklist the access token itself
 *       (15-minute TTL — natural expiry is fine).
 *     • Owned applications are soft-deleted alongside the user.
 *     • Favorites and chat participations are removed (chat history
 *       is retained for the other participants — message authorship
 *       is anonymised in Phase 2 by the retention job).
 *
 *   Phase 2 — hard PII wipe (deferred, retention job after grace window)
 *     • The retention job (services/data-retention.service.ts) walks
 *       soft-deleted users older than 30 days and overwrites PII
 *       columns with opaque placeholders so the row's foreign keys
 *       (audit logs, status transitions) keep working but no
 *       identifiable data remains.
 *
 * Splitting the wipe across two phases is intentional — the grace
 * window gives users a recourse path if the deletion was triggered
 * accidentally or fraudulently before the data is gone for good.
 */

/**
 * Stable opaque placeholder for hard-anonymisation. Calling twice on
 * the same userId produces the same value so a second pass through
 * `anonymizeUser` is a no-op (idempotent retention runs).
 */
export const buildAnonymousPlaceholder = (userId: string): string => {
  const digest = crypto.createHash('sha256').update(`anon:${userId}`).digest('hex').slice(0, 12);
  return `deleted-user-${digest}`;
};

export type DeletionResult = {
  userId: string;
  softDeletedAt: string;
  refreshTokensRevoked: number;
  applicationsSoftDeleted: number;
};

export const requestAccountDeletion = async (
  userId: string,
  reason?: string
): Promise<DeletionResult> => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Phase 1: revoke sessions and soft-delete owned data.
  const [appsResult, tokensResult] = await Promise.all([
    Application.update({ deletedAt: new Date() }, { where: { userId, deletedAt: null } }),
    RefreshToken.update({ is_revoked: true }, { where: { user_id: userId, is_revoked: false } }),
  ]);

  await Promise.all([
    UserFavorite.destroy({ where: { userId } }),
    ChatParticipant.destroy({ where: { participant_id: userId } }),
  ]);

  // Mark the user deactivated *before* destroy() so the soft-deleted
  // row is unambiguously "user-initiated removal" rather than an admin
  // suspension (UserStatus.SUSPENDED carries different audit semantics).
  user.status = UserStatus.DEACTIVATED;
  await user.save();
  await user.destroy();

  await AuditLogService.log({
    userId,
    action: 'GDPR_DELETE_REQUESTED',
    entity: 'User',
    entityId: userId,
    details: {
      reason: reason ?? null,
      phase: 'soft-delete',
      emailSnapshot: redactEmail(user.email),
    },
  });

  logger.info('Account soft-deleted at user request (GDPR phase 1)', {
    userId,
    refreshTokensRevoked: tokensResult[0],
    applicationsSoftDeleted: appsResult[0],
  });

  return {
    userId,
    softDeletedAt: new Date().toISOString(),
    refreshTokensRevoked: tokensResult[0],
    applicationsSoftDeleted: appsResult[0],
  };
};

/**
 * Phase 2: overwrite PII columns on a soft-deleted user. Idempotent —
 * once the placeholder is in place, re-running the function changes
 * nothing.
 *
 * Called by the retention job after the grace window; exported here
 * so admin tooling and tests can invoke it directly.
 */
export const anonymizeUser = async (userId: string): Promise<{ anonymized: boolean }> => {
  const user = await User.findByPk(userId, { paranoid: false });
  if (!user) {
    throw new Error('User not found');
  }

  const placeholder = buildAnonymousPlaceholder(userId);
  const anonymisedEmail = `${placeholder}@deleted.invalid`;

  // The .invalid TLD is reserved (RFC 6761) so the address can never be
  // reused or trigger a real delivery, but it still satisfies the
  // citext column's isEmail validator.
  if (user.email === anonymisedEmail) {
    return { anonymized: false };
  }

  user.firstName = placeholder;
  user.lastName = placeholder;
  user.email = anonymisedEmail;
  user.phoneNumber = null;
  user.dateOfBirth = null;
  user.profileImageUrl = null;
  user.bio = null;
  user.addressLine1 = null;
  user.addressLine2 = null;
  user.postalCode = null;
  user.city = '';
  user.country = '';
  user.password = crypto.randomBytes(32).toString('hex'); // Will be hashed by hook; impossible to log in with.
  user.twoFactorSecret = null;
  user.backupCodes = null;
  user.verificationToken = null;
  user.resetToken = null;

  await user.save();

  await AuditLogService.log({
    userId,
    action: 'GDPR_ANONYMIZED',
    entity: 'User',
    entityId: userId,
    details: { phase: 'hard-anonymise' },
  });

  logger.info('User anonymised (GDPR phase 2)', { userId });
  return { anonymized: true };
};
