import { Op } from 'sequelize';
import Notification, {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from '../models/Notification';
import Role from '../models/Role';
import User, { UserStatus } from '../models/User';
import UserNotificationPrefs from '../models/UserNotificationPrefs';
import UserRole from '../models/UserRole';
import logger, { loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';
import { NotificationChannelService } from './notificationChannelService';
import { NotificationPreferences } from './notification.service';

/**
 * Coarse audience cohorts for system-wide broadcasts (ADS-107). Finer
 * targeting (per-rescue, per-cohort segment, etc.) is intentionally out
 * of scope — those go through the targeted bulk_create path instead.
 */
export type BroadcastAudience = 'all' | 'all-rescues' | 'all-adopters' | 'all-staff';

export const BROADCAST_AUDIENCES: readonly BroadcastAudience[] = [
  'all',
  'all-rescues',
  'all-adopters',
  'all-staff',
] as const;

const RESCUE_ROLE_NAMES = ['rescue_admin', 'rescue_staff', 'rescue_volunteer'] as const;
const STAFF_ROLE_NAMES = ['super_admin', 'admin', 'moderator'] as const;

export type BroadcastInput = {
  audience: BroadcastAudience;
  title: string;
  body: string;
  channels: NotificationChannel[];
  initiatedBy: string;
};

export type BroadcastResult = {
  audience: BroadcastAudience;
  targetCount: number;
  deliveredInApp: number;
  skippedByPrefs: number;
  skippedByDnd: number;
  channels: NotificationChannel[];
};

/**
 * Resolve a cohort to a set of user IDs. Only active users are
 * considered — suspended/deactivated/pending-verification accounts are
 * excluded so we don't leak broadcasts to users we've explicitly cut off.
 */
async function resolveAudience(audience: BroadcastAudience): Promise<string[]> {
  if (audience === 'all') {
    const users = await User.findAll({
      where: { status: UserStatus.ACTIVE },
      attributes: ['userId'],
    });
    return users.map(u => u.userId);
  }

  const roleNames =
    audience === 'all-staff'
      ? [...STAFF_ROLE_NAMES]
      : audience === 'all-rescues'
        ? [...RESCUE_ROLE_NAMES]
        : null;

  if (roleNames) {
    const roles = await Role.findAll({ where: { name: { [Op.in]: roleNames } } });
    const roleIds = roles.map(r => r.roleId);
    if (roleIds.length === 0) {
      return [];
    }
    const userRoles = await UserRole.findAll({
      where: { roleId: { [Op.in]: roleIds } },
      attributes: ['userId'],
    });
    const candidateUserIds = [...new Set(userRoles.map(ur => ur.userId))];
    if (candidateUserIds.length === 0) {
      return [];
    }
    const users = await User.findAll({
      where: { userId: { [Op.in]: candidateUserIds }, status: UserStatus.ACTIVE },
      attributes: ['userId'],
    });
    return users.map(u => u.userId);
  }

  // all-adopters: active users that do NOT hold any rescue_* or staff role.
  const excludeRoleNames = [...RESCUE_ROLE_NAMES, ...STAFF_ROLE_NAMES];
  const excludedRoles = await Role.findAll({ where: { name: { [Op.in]: excludeRoleNames } } });
  const excludedRoleIds = excludedRoles.map(r => r.roleId);
  const excludedUserRows = excludedRoleIds.length
    ? await UserRole.findAll({
        where: { roleId: { [Op.in]: excludedRoleIds } },
        attributes: ['userId'],
      })
    : [];
  const excludedUserIds = new Set(excludedUserRows.map(ur => ur.userId));

  const activeUsers = await User.findAll({
    where: { status: UserStatus.ACTIVE },
    attributes: ['userId'],
  });
  return activeUsers.map(u => u.userId).filter(id => !excludedUserIds.has(id));
}

/**
 * System-wide broadcast to a coarse audience cohort. Honours per-user
 * preferences and DND for non-in-app channels — in-app delivery is the
 * baseline because broadcasts are admin-initiated platform comms, not
 * marketing.
 *
 * Idempotency: the route layer wraps this in the global Idempotency-Key
 * middleware (see middleware/idempotency.ts), so a retry with the same
 * key inside 24h replays the cached response instead of re-fanning.
 */
export class BroadcastService {
  static async broadcast(input: BroadcastInput): Promise<BroadcastResult> {
    const startTime = Date.now();

    const userIds = await resolveAudience(input.audience);
    const targetCount = userIds.length;

    let deliveredInApp = 0;
    let skippedByPrefs = 0;
    let skippedByDnd = 0;

    // Per-user fan-out. In-app delivery is unconditional (the broadcast
    // is the platform telling the user something), but email/push/sms
    // are gated by the user's preferences and DND just like every other
    // notification path. This mirrors NotificationService.createNotification
    // — we deliberately don't bypass user prefs from the broadcast layer.
    const wantsExternalChannels = input.channels.some(c => c !== NotificationChannel.IN_APP);

    for (const userId of userIds) {
      try {
        const notification = await Notification.create({
          user_id: userId,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: input.title,
          message: input.body,
          priority: NotificationPriority.NORMAL,
          channel: NotificationChannel.IN_APP,
          created_at: new Date(),
        });

        if (input.channels.includes(NotificationChannel.IN_APP)) {
          deliveredInApp += 1;
        }

        if (!wantsExternalChannels) {
          continue;
        }

        // External channel delivery respects per-user prefs and DND.
        // The in-app row above is unconditional — it's a record of the
        // platform announcement, distinct from push/email/SMS reach.
        const userPrefs = await loadPrefsForBroadcast(userId);

        if (NotificationChannelService.isInQuietHours(userPrefs)) {
          skippedByDnd += 1;
          continue;
        }

        const allowedChannels = await NotificationChannelService.getDeliveryChannels(
          userId,
          NotificationType.SYSTEM_ANNOUNCEMENT,
          'normal'
        );
        const requestedExternal: ('email' | 'push' | 'sms')[] = [];
        for (const c of input.channels) {
          if (c === NotificationChannel.EMAIL) {
            requestedExternal.push('email');
          } else if (c === NotificationChannel.PUSH) {
            requestedExternal.push('push');
          } else if (c === NotificationChannel.SMS) {
            requestedExternal.push('sms');
          }
        }
        const toDeliver = requestedExternal.filter(c => allowedChannels.includes(c));

        if (toDeliver.length === 0 && requestedExternal.length > 0) {
          skippedByPrefs += 1;
          continue;
        }

        await NotificationChannelService.deliverToChannels(
          {
            userId,
            title: input.title,
            message: input.body,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            data: { notificationId: notification.notification_id },
            priority: 'normal',
          },
          toDeliver
        );
      } catch (err) {
        logger.error('[broadcast] per-user fan-out failed', {
          userId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await AuditLogService.log({
      userId: input.initiatedBy,
      action: 'BROADCAST_SENT',
      entity: 'Notification',
      entityId: 'broadcast',
      details: {
        audience: input.audience,
        targetCount,
        deliveredInApp,
        skippedByPrefs,
        skippedByDnd,
        channels: input.channels,
      },
    });

    loggerHelpers.logBusiness('Broadcast Sent', {
      audience: input.audience,
      targetCount,
      deliveredInApp,
      skippedByPrefs,
      skippedByDnd,
      duration: Date.now() - startTime,
    });

    return {
      audience: input.audience,
      targetCount,
      deliveredInApp,
      skippedByPrefs,
      skippedByDnd,
      channels: input.channels,
    };
  }

  /**
   * Helper exposed for the admin UI: how many users would receive a
   * broadcast for a given cohort, without actually sending anything.
   */
  static async previewAudienceCount(audience: BroadcastAudience): Promise<number> {
    const ids = await resolveAudience(audience);
    return ids.length;
  }
}

/**
 * Project the typed prefs row into the API-shaped object the channel
 * service's DND helper expects. Mirrors notificationChannelService.ts
 * so we don't pull in additional helpers just for the broadcast path.
 */
async function loadPrefsForBroadcast(userId: string): Promise<NotificationPreferences> {
  const row = await UserNotificationPrefs.findOne({ where: { user_id: userId } });
  return {
    email: row?.email_enabled ?? true,
    push: row?.push_enabled ?? true,
    sms: row?.sms_enabled ?? false,
    applications: row?.application_updates ?? true,
    messages: row?.chat_messages ?? true,
    system: true,
    marketing: false,
    reminders: true,
    quietHoursStart: row?.quiet_hours_start ?? undefined,
    quietHoursEnd: row?.quiet_hours_end ?? undefined,
    timezone: row?.timezone ?? 'UTC',
  };
}
