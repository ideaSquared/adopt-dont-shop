import crypto from 'crypto';
import { Transaction } from 'sequelize';
import sequelize from '../sequelize';
import Application, { ApplicationStatus } from '../models/Application';
import ApplicationAnswer from '../models/ApplicationAnswer';
import ApplicationReference from '../models/ApplicationReference';
import ApplicationStatusTransition from '../models/ApplicationStatusTransition';
import ChatParticipant from '../models/ChatParticipant';
import DeviceToken from '../models/DeviceToken';
import Message from '../models/Message';
import Notification, { NotificationType } from '../models/Notification';
import Pet, { PetStatus } from '../models/Pet';
import Rating from '../models/Rating';
import RefreshToken from '../models/RefreshToken';
import Rescue from '../models/Rescue';
import StaffMember from '../models/StaffMember';
import SupportTicket from '../models/SupportTicket';
import SupportTicketResponse from '../models/SupportTicketResponse';
import User, { UserStatus } from '../models/User';
import UserApplicationPrefs from '../models/UserApplicationPrefs';
import UserConsent, { ConsentPurpose } from '../models/UserConsent';
import UserFavorite from '../models/UserFavorite';
import UserNotificationPrefs from '../models/UserNotificationPrefs';
import UserPrivacyPrefs from '../models/UserPrivacyPrefs';
import { AuditLogService } from './auditLog.service';
import { NotificationService } from './notification.service';
import { logger } from '../utils/logger';

/**
 * GDPR data subject rights — erasure (Art. 17) and export (Art. 15/20).
 *
 * User erasure runs in two phases:
 *
 *   Phase 1 — requestErasure (immediate, transactional):
 *     Soft-deletes the user, revokes refresh tokens, clears device
 *     tokens / favourites / pending notifications, and stamps
 *     pending_anonymization_at = now(). The user's PII (email, name,
 *     address) is intentionally LEFT IN PLACE so support staff can
 *     identify and restore the account during the grace window if the
 *     erasure was accidental or fraudulent.
 *
 *   Phase 2 — executeAnonymization (deferred, retention worker):
 *     Scrubs every direct identifier from the User row, rewrites
 *     sender_id-scoped Message bodies to a tombstone, clears 2FA
 *     secrets / backup codes / verification + reset tokens, and
 *     randomises the password. Clears pending_anonymization_at.
 *     Idempotent — once the row has been anonymised the call is a no-op.
 *
 * cancelErasure provides the in-grace off-ramp: it un-soft-deletes the
 * user and clears pending_anonymization_at so the retention worker
 * stops considering it.
 *
 * Orphan-FK retention: when a user is anonymised, foreign-key rows in
 * the following tables intentionally keep their userId references with
 * the user-side identifiers wiped, rather than being deleted:
 *
 *   - StaffMember          rescue staffing history (which rescues had
 *                          which staff members — needed for audit and
 *                          rescue-side records even after the staff
 *                          user is gone).
 *   - Rating               review counts and averages on rescues /
 *                          adopters stay accurate; the reviewer
 *                          becomes anonymous but the rating itself is
 *                          legitimate-interest content for the reviewee.
 *   - Report               moderation audit trail: reports filed by or
 *                          against a deleted user remain so the
 *                          moderation team can trace decisions.
 *   - SupportTicket        support history for the assigned agent /
 *                          rescue — closing tickets retroactively
 *                          when the reporter is anonymised would lose
 *                          context.
 *
 * The User row itself uses paranoid soft-delete (deleted_at) so the
 * primary key continues to resolve foreign-key joins. The retention
 * worker never hard-deletes the User row.
 */

const GDPR_ANONYMIZATION_GRACE_DAYS = 30;

type AnonymizeOptions = {
  reason?: string;
  actorUserId?: string;
};

type RequestErasureResult = {
  userId: string;
  pendingAnonymizationAt: Date;
  refreshTokensRevoked: number;
  deviceTokensCleared: number;
};

type AnonymizationResult = {
  anonymized: boolean;
};

type CancelErasureResult = {
  userId: string;
};

type EraseRescueResult = {
  rescueId: string;
  alreadyArchived: boolean;
  petsArchived: number;
  applicationsRejected: number;
  staffDowngraded: number;
  applicantUserIdsToNotify: string[];
};

const ANON_EMAIL_DOMAIN = 'redacted.local';
const ANON_FIRST_NAME = 'Deleted';
const ANON_LAST_NAME = 'User';
const ANON_MESSAGE_BODY = '[message removed at user request]';
const ANON_RESCUE_NAME = 'Deleted Rescue';
const ANON_CONTACT_PERSON = 'Deleted';

const tombstoneEmail = (userId: string): string => `deleted-${userId}@${ANON_EMAIL_DOMAIN}`;
const tombstoneRescueEmail = (rescueId: string): string =>
  `deleted-rescue-${rescueId}@${ANON_EMAIL_DOMAIN}`;

export { GDPR_ANONYMIZATION_GRACE_DAYS };

export const GdprService = {
  /**
   * Phase 1 of GDPR Art. 17 erasure.
   *
   * Soft-deletes the user, revokes all active sessions, clears device
   * tokens, drops favourites and pending notifications, and stamps
   * pending_anonymization_at = now(). The user's PII is intentionally
   * NOT scrubbed at this step — that happens in phase 2, after the
   * grace window, via executeAnonymization. Keeping PII for the grace
   * window lets support reverse an accidental or fraudulent deletion
   * via cancelErasure.
   *
   * Idempotent: a second call on an already-soft-deleted user refreshes
   * pending_anonymization_at (resetting the grace window from "now")
   * and writes a new audit row, but does not re-revoke tokens that are
   * already gone.
   */
  async requestErasure(
    userId: string,
    options: AnonymizeOptions = {}
  ): Promise<RequestErasureResult> {
    const { reason, actorUserId } = options;

    return sequelize.transaction(async (tx: Transaction) => {
      const user = await User.findByPk(userId, { transaction: tx, paranoid: false });
      if (!user) {
        throw new Error('User not found');
      }

      const pendingAt = new Date();

      // Drop session / push tokens — no further auth allowed.
      const refreshTokensRevoked = await RefreshToken.destroy({
        where: { user_id: userId },
        transaction: tx,
        force: true,
      });
      const deviceTokensCleared = await DeviceToken.destroy({
        where: { user_id: userId },
        transaction: tx,
        force: true,
      });

      // Discretionary user-owned content: favourites and pending
      // notifications are pure preferences / queues, no retention need.
      await UserFavorite.destroy({ where: { userId }, transaction: tx, force: true });
      await Notification.destroy({ where: { user_id: userId }, transaction: tx, force: true });

      // Mark deactivated and stamp the phase-1 grace marker. PII fields
      // (email, name, phone, address, 2FA secrets) are left untouched
      // so support tooling can identify the account during the grace
      // window. The retention worker scrubs them via executeAnonymization.
      const phase1Payload: Record<string, unknown> = {
        status: UserStatus.DEACTIVATED,
        pendingAnonymizationAt: pendingAt,
      };
      await user.update(phase1Payload, { transaction: tx });

      // Soft-delete the User row last (paranoid: true) — destroy() may
      // be a no-op if the row was already soft-deleted on an earlier
      // attempt, which is fine.
      if (!user.deletedAt) {
        await user.destroy({ transaction: tx });
      }

      await AuditLogService.log({
        action: 'USER_ERASURE_REQUESTED',
        entity: 'User',
        entityId: userId,
        userId: actorUserId ?? userId,
        details: {
          reason: reason ?? 'GDPR Art. 17 erasure request',
          actorUserId: actorUserId ?? null,
          graceDays: GDPR_ANONYMIZATION_GRACE_DAYS,
        },
      });

      logger.info('User erasure requested (GDPR phase 1)', {
        userId,
        actorUserId: actorUserId ?? null,
        refreshTokensRevoked,
        deviceTokensCleared,
      });

      return {
        userId,
        pendingAnonymizationAt: pendingAt,
        refreshTokensRevoked,
        deviceTokensCleared,
      };
    });
  },

  /**
   * Phase 2 of GDPR Art. 17 erasure. Called by the retention worker
   * for users whose grace window has elapsed.
   *
   * Scrubs every direct identifier from the User row, rewrites
   * sender-scoped Message bodies to a tombstone, clears 2FA secrets /
   * backup codes / verification + reset tokens, and randomises the
   * password. Clears pending_anonymization_at on completion.
   *
   * Idempotent: returns `{ anonymized: false }` if the email is already
   * in the tombstone form, leaving the row untouched.
   */
  async executeAnonymization(userId: string): Promise<AnonymizationResult> {
    return sequelize.transaction(async (tx: Transaction) => {
      const user = await User.scope('withSecrets').findByPk(userId, {
        transaction: tx,
        paranoid: false,
      });
      if (!user) {
        throw new Error('User not found');
      }

      if (user.email.endsWith(`@${ANON_EMAIL_DOMAIN}`)) {
        // Already anonymised on a previous pass. Clear the pending
        // marker if it's somehow still set (defensive — should already
        // be NULL) and exit without writing another audit row.
        if (user.pendingAnonymizationAt) {
          const clearPayload: Record<string, unknown> = { pendingAnonymizationAt: null };
          await user.update(clearPayload, { transaction: tx });
        }
        return { anonymized: false };
      }

      // Tombstone the User row. We keep the row (and its userId) so FKs
      // from applications, audit logs, ratings, reports etc. continue
      // to resolve, but every direct identifier column is stripped.
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
        // Random password so the account can never be logged into.
        // hashPassword runs in beforeUpdate, so we can pass plain text.
        password: crypto.randomBytes(32).toString('hex'),
        pendingAnonymizationAt: null,
      };
      await user.update(tombstonePayload, { transaction: tx });

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

      await AuditLogService.log({
        action: 'USER_ANONYMIZED',
        entity: 'User',
        entityId: userId,
        userId,
        details: {
          phase: 'phase-2-anonymise',
        },
      });

      logger.info('User anonymised (GDPR phase 2)', { userId });

      return { anonymized: true };
    });
  },

  /**
   * In-grace off-ramp for phase-1 erasure. Admin-only — clears the
   * pending_anonymization_at marker AND undeletes the User row, so the
   * account is restored to its pre-erasure state. The retention worker
   * will no longer consider the user.
   *
   * Throws if the user is already anonymised (email in tombstone form)
   * — there's nothing meaningful to restore once PII has been scrubbed.
   */
  async cancelErasure(userId: string, actor: { userId: string }): Promise<CancelErasureResult> {
    return sequelize.transaction(async (tx: Transaction) => {
      const user = await User.findByPk(userId, { transaction: tx, paranoid: false });
      if (!user) {
        throw new Error('User not found');
      }

      if (user.email.endsWith(`@${ANON_EMAIL_DOMAIN}`)) {
        throw new Error('User already anonymized — cannot cancel erasure');
      }

      const restorePayload: Record<string, unknown> = {
        pendingAnonymizationAt: null,
        status: UserStatus.ACTIVE,
      };
      await user.update(restorePayload, { transaction: tx });
      if (user.deletedAt) {
        await user.restore({ transaction: tx });
      }

      await AuditLogService.log({
        action: 'USER_ERASURE_CANCELLED',
        entity: 'User',
        entityId: userId,
        userId: actor.userId,
        details: {
          actorUserId: actor.userId,
        },
      });

      logger.info('User erasure cancelled within grace window', {
        userId,
        actorUserId: actor.userId,
      });

      return { userId };
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

  /**
   * GDPR Art. 17 — rescue account erasure (ADS-87).
   *
   * Anonymises the Rescue row in place (PII stripped, status flipped to
   * `inactive`, paranoid soft-delete applied) while preserving FK
   * integrity for owned pets, adoption history, applications, chats and
   * audit logs that reference the rescue.
   *
   * Side-effects per the design doc:
   *   - Owned pets: archived (filtered out of discovery/search by
   *     existing `archived: false` scopes).
   *   - Pending applications on owned pets: transitioned to REJECTED
   *     with reason "rescue account deleted"; applicants get an in-app
   *     notification fired AFTER commit.
   *   - StaffMember rows for the rescue: paranoid soft-deleted (the
   *     rescue-affiliation join used by the auth middleware).
   *   - User accounts and their UserRole rows are intentionally left
   *     untouched — staff are downgraded, not deleted.
   *   - Chat history retained; the rescue-side display name will now
   *     read "Deleted Rescue" via the anonymised row.
   *
   * Idempotent: a second call on an already-archived rescue is a no-op
   * apart from a fresh audit log row.
   *
   * Returns a summary of the action so the caller can surface counts
   * (and the post-commit notification fan-out can target applicants).
   */
  async eraseRescue(rescueId: string, options: AnonymizeOptions = {}): Promise<EraseRescueResult> {
    const { reason, actorUserId } = options;

    const result = await sequelize.transaction(async (tx: Transaction) => {
      // SELECT ... FOR UPDATE so concurrent erase attempts serialize
      // rather than racing. Sequelize maps this to a row-level lock on
      // dialects that support it; SQLite (test) is single-writer so the
      // lock is effectively a no-op there.
      const rescue = await Rescue.findByPk(rescueId, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
        paranoid: false,
      });
      if (!rescue) {
        throw new Error('Rescue not found');
      }

      const alreadyArchived =
        rescue.email.endsWith(`@${ANON_EMAIL_DOMAIN}`) || rescue.deletedAt !== null;

      // Anonymise the rescue row. Keep `name` collision-free by suffixing
      // with the rescueId — the column has a unique index and a second
      // erase would otherwise collide on "Deleted Rescue".
      const rescueTombstone: Record<string, unknown> = {
        name: `${ANON_RESCUE_NAME} ${rescueId}`,
        email: tombstoneRescueEmail(rescueId),
        phone: null,
        address: 'redacted',
        city: 'redacted',
        county: null,
        postcode: 'redacted',
        description: null,
        mission: null,
        website: null,
        contactPerson: ANON_CONTACT_PERSON,
        contactTitle: null,
        contactEmail: null,
        contactPhone: null,
        status: 'inactive',
      };
      await rescue.update(rescueTombstone, { transaction: tx });

      // Archive every pet owned by the rescue. `archived: true` keeps
      // the FK intact (adoption history, applications) but flips the
      // pet out of discovery — existing pet scopes filter on
      // `archived: false`.
      const [petsArchived] = await Pet.update(
        { archived: true, status: PetStatus.NOT_AVAILABLE },
        {
          where: { rescueId, archived: false },
          transaction: tx,
        }
      );

      // Pending applications on this rescue's pets — auto-reject so the
      // applicants don't sit waiting forever. SUBMITTED is the only
      // pending status in this codebase; APPROVED / REJECTED /
      // WITHDRAWN are final.
      const pendingApps = await Application.findAll({
        where: { rescueId, status: ApplicationStatus.SUBMITTED },
        transaction: tx,
      });

      const applicantUserIdsToNotify: string[] = [];
      const rejectionReason = 'Rescue account deleted';
      for (const app of pendingApps) {
        const fromStatus = app.status;
        // The status-transition trigger denormalises to_status back onto
        // the application row (Postgres trigger; SQLite test fallback
        // is an afterCreate hook on ApplicationStatusTransition). We
        // still set rejectionReason on the row directly because the
        // trigger only propagates the status column.
        await ApplicationStatusTransition.create(
          {
            applicationId: app.applicationId,
            fromStatus,
            toStatus: ApplicationStatus.REJECTED,
            transitionedAt: new Date(),
            transitionedBy: actorUserId ?? null,
            reason: rejectionReason,
            metadata: { cause: 'rescue_erasure', rescueId },
          },
          { transaction: tx }
        );
        await app.update(
          { rejectionReason, status: ApplicationStatus.REJECTED },
          { transaction: tx, hooks: false }
        );
        applicantUserIdsToNotify.push(app.userId);
      }

      // Downgrade staff: drop their StaffMember rows for this rescue.
      // User accounts (and any UserRole grants) are untouched per the
      // design doc — staff stay as users, they just lose this
      // affiliation.
      const staff = await StaffMember.findAll({
        where: { rescueId },
        transaction: tx,
      });
      let staffDowngraded = 0;
      for (const member of staff) {
        await member.destroy({ transaction: tx });
        staffDowngraded += 1;
      }

      // Soft-delete the rescue row last so it stops resolving via the
      // default scope. Anything that needs to reach it (audit logs,
      // FK joins) can still do so with `paranoid: false`.
      if (!rescue.deletedAt) {
        await rescue.destroy({ transaction: tx });
      }

      await AuditLogService.log({
        action: 'GDPR_RESCUE_ERASE',
        entity: 'Rescue',
        entityId: rescueId,
        userId: actorUserId ?? rescueId,
        details: {
          reason: reason ?? 'GDPR Art. 17 rescue erasure request',
          alreadyArchived,
          petsArchived,
          applicationsRejected: pendingApps.length,
          staffDowngraded,
          actorUserId: actorUserId ?? null,
        },
      });

      logger.info('Rescue anonymised for GDPR erasure', {
        rescueId,
        actorUserId: actorUserId ?? null,
        alreadyArchived,
        petsArchived,
        applicationsRejected: pendingApps.length,
        staffDowngraded,
      });

      return {
        rescueId,
        alreadyArchived,
        petsArchived,
        applicationsRejected: pendingApps.length,
        staffDowngraded,
        applicantUserIdsToNotify,
      };
    });

    // Post-commit side-effect: notify each applicant that the rescue
    // they applied to has been deleted and their application was
    // auto-rejected. Failure to deliver does NOT roll back the erase —
    // the source-of-truth state is already committed.
    const uniqueApplicants = [...new Set(result.applicantUserIdsToNotify)];
    if (uniqueApplicants.length > 0) {
      try {
        await NotificationService.createBulkNotifications(
          uniqueApplicants,
          {
            type: NotificationType.APPLICATION_STATUS,
            title: 'Your application was closed',
            message:
              'The rescue you applied to has closed its account. Your application has been automatically rejected. Please browse other rescues for available pets.',
            data: { rescueId, cause: 'rescue_erasure' },
          },
          actorUserId ?? rescueId
        );
      } catch (error) {
        logger.error('Failed to notify applicants after rescue erasure', {
          rescueId,
          applicantCount: uniqueApplicants.length,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  },
};

export default GdprService;
