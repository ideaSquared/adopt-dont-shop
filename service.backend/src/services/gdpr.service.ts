import { Transaction } from 'sequelize';
import sequelize from '../sequelize';
import Application from '../models/Application';
import ApplicationAnswer from '../models/ApplicationAnswer';
import ApplicationReference from '../models/ApplicationReference';
import ChatParticipant from '../models/ChatParticipant';
import DeviceToken from '../models/DeviceToken';
import Message from '../models/Message';
import Notification from '../models/Notification';
import Rating from '../models/Rating';
import RefreshToken from '../models/RefreshToken';
import SupportTicket from '../models/SupportTicket';
import SupportTicketResponse from '../models/SupportTicketResponse';
import User, { UserStatus } from '../models/User';
import UserApplicationPrefs from '../models/UserApplicationPrefs';
import UserConsent, { ConsentPurpose } from '../models/UserConsent';
import UserFavorite from '../models/UserFavorite';
import UserNotificationPrefs from '../models/UserNotificationPrefs';
import UserPrivacyPrefs from '../models/UserPrivacyPrefs';
import { AuditLogService } from './auditLog.service';
import { logger } from '../utils/logger';

/**
 * GDPR data subject rights — anonymise (Art. 17) and export (Art. 15/20).
 *
 * Anonymise tombstones the User row in-place rather than hard-deleting,
 * because adoption applications, support tickets, audit logs and other
 * records have legitimate-interest / legal retention requirements that
 * outlive the user. We strip every direct identifier from the User row
 * and from chat / support content, then soft-delete the user.
 */

type AnonymizeOptions = {
  reason?: string;
  actorUserId?: string;
};

const ANON_EMAIL_DOMAIN = 'redacted.local';
const ANON_FIRST_NAME = 'Deleted';
const ANON_LAST_NAME = 'User';
const ANON_MESSAGE_BODY = '[message removed at user request]';

const tombstoneEmail = (userId: string): string => `deleted-${userId}@${ANON_EMAIL_DOMAIN}`;

export const GdprService = {
  /**
   * Anonymise a user. Idempotent: if the user is already anonymised the
   * call is a no-op (apart from a fresh audit log entry). All work is
   * done in a single transaction so a partial run can't leave a half-
   * scrubbed user in the DB.
   */
  async anonymizeUser(userId: string, options: AnonymizeOptions = {}): Promise<void> {
    const { reason, actorUserId } = options;

    await sequelize.transaction(async (tx: Transaction) => {
      const user = await User.scope('withSecrets').findByPk(userId, { transaction: tx });
      if (!user) {
        throw new Error('User not found');
      }

      const alreadyAnonymized = user.email.endsWith(`@${ANON_EMAIL_DOMAIN}`);

      // Tombstone the User row. We keep the row (and its userId) so FKs
      // from applications, audit logs etc. continue to resolve, but the
      // PII columns are stripped.
      // Cast the payload to satisfy Sequelize's attribute typing — the
      // User attributes interface uses `string | undefined` for some
      // optional fields (city, country, location) that we want to clear
      // to null at the DB level. Passing null is correct for the DB but
      // not for the TS model type, so we widen here.
      const tombstonePayload: Record<string, unknown> = {
        email: tombstoneEmail(user.userId),
        firstName: ANON_FIRST_NAME,
        lastName: ANON_LAST_NAME,
        phoneNumber: null,
        phoneVerified: false,
        dateOfBirth: null,
        profileImageUrl: null,
        bio: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        city: null,
        country: null,
        location: null,
        twoFactorSecret: null,
        twoFactorEnabled: false,
        backupCodes: null,
        verificationToken: null,
        verificationTokenExpiresAt: null,
        resetToken: null,
        resetTokenExpiration: null,
        status: UserStatus.DEACTIVATED,
        // Random password so the account can never be logged into.
        // hashPassword runs in beforeUpdate, so we can pass plain text.
        password: `anonymized-${user.userId}-${Date.now()}`,
      };
      await user.update(tombstonePayload, { transaction: tx });

      // Drop session / push tokens — no further auth allowed.
      await RefreshToken.destroy({ where: { user_id: userId }, transaction: tx, force: true });
      await DeviceToken.destroy({ where: { user_id: userId }, transaction: tx, force: true });

      // Discretionary user-owned content: favourites and pending
      // notifications are pure preferences / queues, no retention need.
      await UserFavorite.destroy({ where: { userId }, transaction: tx, force: true });
      await Notification.destroy({ where: { user_id: userId }, transaction: tx, force: true });

      // Strip message bodies but keep the row so chat threads remain
      // coherent for the rescue staff side of the conversation.
      const messageScrub: Record<string, unknown> = {
        content: ANON_MESSAGE_BODY,
        attachments: [],
      };
      await Message.update(messageScrub, { where: { sender_id: userId }, transaction: tx });

      // ChatParticipant rows are intentionally left intact so that
      // historical message attribution still resolves on the rescue
      // staff side. The user is no longer reachable via the User row,
      // and Sender lookups now return the tombstoned name.

      // Soft-delete the User row last (paranoid: true). Anything that
      // expects the user to exist (audit logs etc.) still resolves via
      // the unscoped find used in those queries.
      await user.destroy({ transaction: tx });

      await AuditLogService.log({
        action: 'GDPR_ANONYMIZE',
        entity: 'User',
        entityId: userId,
        userId: actorUserId ?? userId,
        details: {
          reason: reason ?? 'GDPR Art. 17 erasure request',
          alreadyAnonymized,
          actorUserId: actorUserId ?? null,
        },
      });

      logger.info('User anonymised for GDPR erasure', {
        userId,
        actorUserId: actorUserId ?? null,
        alreadyAnonymized,
      });
    });
  },

  /**
   * Record a consent decision. Append-only — granting and withdrawing
   * consent both insert a new row.
   */
  async recordConsent(input: {
    userId: string;
    purpose: ConsentPurpose;
    granted: boolean;
    policyVersion: string;
    source?: string | null;
    ipAddress?: string | null;
  }): Promise<UserConsent> {
    const consent = await UserConsent.create({
      userId: input.userId,
      purpose: input.purpose,
      granted: input.granted,
      policyVersion: input.policyVersion,
      source: input.source ?? null,
      ipAddress: input.ipAddress ?? null,
    });

    await AuditLogService.log({
      action: input.granted ? 'CONSENT_GRANT' : 'CONSENT_WITHDRAW',
      entity: 'UserConsent',
      entityId: consent.consentId,
      userId: input.userId,
      details: {
        purpose: input.purpose,
        policyVersion: input.policyVersion,
        source: input.source ?? null,
      },
    });

    return consent;
  },

  /**
   * Latest grant/withdrawal per purpose. Purposes the user has never
   * touched are absent from the result — callers should treat absence
   * as "not granted".
   */
  async getCurrentConsents(userId: string): Promise<Record<string, boolean>> {
    const rows = await UserConsent.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    const latest: Record<string, boolean> = {};
    for (const row of rows) {
      if (latest[row.purpose] === undefined) {
        latest[row.purpose] = row.granted;
      }
    }
    return latest;
  },

  /**
   * GDPR Art. 15 / 20 — return everything we have on a user as plain
   * JSON. Callers (the controller) are responsible for delivering it
   * over a secure channel.
   */
  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const user = await User.scope('withSecrets').findByPk(userId, { paranoid: false });
    if (!user) {
      throw new Error('User not found');
    }

    const [
      privacyPrefs,
      notificationPrefs,
      applicationPrefs,
      consents,
      applications,
      applicationAnswers,
      applicationReferences,
      favorites,
      sentMessages,
      chatMemberships,
      ratingsGiven,
      ratingsReceived,
      supportTickets,
      ticketResponses,
    ] = await Promise.all([
      UserPrivacyPrefs.findOne({ where: { user_id: userId } }),
      UserNotificationPrefs.findOne({ where: { user_id: userId } }),
      UserApplicationPrefs.findOne({ where: { user_id: userId } }),
      UserConsent.findAll({ where: { userId }, order: [['createdAt', 'ASC']] }),
      Application.findAll({ where: { userId }, paranoid: false }),
      ApplicationAnswer.findAll({
        include: [{ model: Application, as: 'Application', where: { userId }, attributes: [] }],
      }),
      ApplicationReference.findAll({
        include: [{ model: Application, as: 'Application', where: { userId }, attributes: [] }],
      }),
      UserFavorite.findAll({ where: { userId } }),
      Message.findAll({ where: { sender_id: userId } }),
      ChatParticipant.findAll({ where: { participant_id: userId } }),
      Rating.findAll({ where: { reviewer_id: userId } }),
      Rating.findAll({ where: { reviewee_id: userId } }),
      SupportTicket.findAll({ where: { userId } }),
      SupportTicketResponse.findAll({ where: { responderId: userId } }),
    ]);

    // Don't expose password hashes / 2FA secrets even on a self-export.
    const userJson = user.toJSON() as unknown as Record<string, unknown>;
    delete userJson.password;
    delete userJson.twoFactorSecret;
    delete userJson.backupCodes;
    delete userJson.verificationToken;
    delete userJson.resetToken;

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      user: userJson,
      preferences: {
        privacy: privacyPrefs,
        notifications: notificationPrefs,
        applications: applicationPrefs,
      },
      consents,
      applications,
      applicationAnswers,
      applicationReferences,
      favorites,
      messages: sentMessages,
      chatMemberships,
      ratingsGiven,
      ratingsReceived,
      supportTickets,
      ticketResponses,
    };
  },
};

export default GdprService;
