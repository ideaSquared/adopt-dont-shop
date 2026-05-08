import Application from '../models/Application';
import ApplicationReference from '../models/ApplicationReference';
import AuditLog from '../models/AuditLog';
import EmailPreference from '../models/EmailPreference';
import Notification from '../models/Notification';
import SwipeAction from '../models/SwipeAction';
import SwipeSession from '../models/SwipeSession';
import SupportTicket from '../models/SupportTicket';
import User from '../models/User';
import UserApplicationPrefs from '../models/UserApplicationPrefs';
import UserFavorite from '../models/UserFavorite';
import UserNotificationPrefs from '../models/UserNotificationPrefs';
import UserPrivacyPrefs from '../models/UserPrivacyPrefs';
import { logger } from '../utils/logger';

/**
 * ADS-427: GDPR Article 20 (data portability) — produce a JSON archive
 * of every row owned by the requesting user.
 *
 * Scope rules:
 *   - INCLUDED: profile fields, prefs, applications and their references,
 *     favorites, swipe sessions/actions, support tickets, notifications,
 *     email preferences, and a slice of audit logs where the user was
 *     the actor.
 *   - EXCLUDED: hashed credentials (password, twoFactorSecret,
 *     verificationToken, resetToken) and rows owned by other users
 *     (e.g. messages they sent in a chat the requester also participates
 *     in — those belong to the sender's export bundle).
 *
 * Returned shape is a plain object so callers can choose to stream it
 * (Content-Type: application/json) or wrap in a tarball later. We
 * deliberately keep the format flat and readable rather than schema-
 * matching the DB tables so the bundle is useful to the recipient.
 */

export type DataExportBundle = {
  generatedAt: string;
  userId: string;
  profile: Record<string, unknown>;
  preferences: {
    notifications: unknown;
    privacy: unknown;
    application: unknown;
    email: unknown;
  };
  applications: Array<Record<string, unknown> & { references: unknown[] }>;
  favorites: unknown[];
  swipeSessions: unknown[];
  swipeActions: unknown[];
  supportTickets: unknown[];
  notifications: unknown[];
  auditLogs: unknown[];
};

const SAFE_USER_FIELDS = [
  'userId',
  'firstName',
  'lastName',
  'email',
  'emailVerified',
  'phoneNumber',
  'phoneVerified',
  'dateOfBirth',
  'profileImageUrl',
  'bio',
  'status',
  'userType',
  'lastLoginAt',
  'timezone',
  'language',
  'country',
  'city',
  'addressLine1',
  'addressLine2',
  'postalCode',
  'termsAcceptedAt',
  'privacyPolicyAcceptedAt',
  'createdAt',
  'updatedAt',
];

const pickSafeUserFields = (user: User): Record<string, unknown> => {
  // toJSON returns the model's attribute bag; cast through unknown so
  // we can index by string without TS narrowing each key individually.
  const json = user.toJSON() as unknown as Record<string, unknown>;
  return Object.fromEntries(SAFE_USER_FIELDS.map(key => [key, json[key]]));
};

export const exportUserData = async (userId: string): Promise<DataExportBundle> => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const [
    notificationPrefs,
    privacyPrefs,
    applicationPrefs,
    emailPrefs,
    applications,
    favorites,
    swipeSessions,
    swipeActions,
    supportTickets,
    notifications,
    auditLogs,
  ] = await Promise.all([
    UserNotificationPrefs.findOne({ where: { user_id: userId } }),
    UserPrivacyPrefs.findOne({ where: { user_id: userId } }),
    UserApplicationPrefs.findOne({ where: { user_id: userId } }),
    EmailPreference.findOne({ where: { userId } }),
    Application.findAll({ where: { userId } }),
    UserFavorite.findAll({ where: { userId } }),
    SwipeSession.findAll({ where: { userId } }),
    SwipeAction.findAll({ where: { userId } }),
    SupportTicket.findAll({ where: { userId } }),
    Notification.findAll({ where: { user_id: userId } }),
    AuditLog.findAll({ where: { user: userId }, limit: 1000, order: [['timestamp', 'DESC']] }),
  ]);

  const applicationsWithRefs = await Promise.all(
    applications.map(async app => {
      const refs = await ApplicationReference.findAll({
        where: { application_id: app.applicationId },
      });
      return { ...app.toJSON(), references: refs.map(r => r.toJSON()) };
    })
  );

  const bundle: DataExportBundle = {
    generatedAt: new Date().toISOString(),
    userId,
    profile: pickSafeUserFields(user),
    preferences: {
      notifications: notificationPrefs?.toJSON() ?? null,
      privacy: privacyPrefs?.toJSON() ?? null,
      application: applicationPrefs?.toJSON() ?? null,
      email: emailPrefs?.toJSON() ?? null,
    },
    applications: applicationsWithRefs,
    favorites: favorites.map(f => f.toJSON()),
    swipeSessions: swipeSessions.map(s => s.toJSON()),
    swipeActions: swipeActions.map(s => s.toJSON()),
    supportTickets: supportTickets.map(t => t.toJSON()),
    notifications: notifications.map(n => n.toJSON()),
    auditLogs: auditLogs.map(a => a.toJSON()),
  };

  logger.info('Data export bundle generated', {
    userId,
    applicationCount: applicationsWithRefs.length,
    notificationCount: notifications.length,
    auditLogCount: auditLogs.length,
  });

  return bundle;
};
