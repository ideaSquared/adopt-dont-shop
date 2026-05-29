import { Op, type WhereOptions } from 'sequelize';
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
/**
 * How many recipients to materialise + write per chunk. Bounds the
 * working set in memory and the number of rows per bulkCreate so a
 * platform-wide broadcast can't load every active user id at once or
 * issue one INSERT per recipient.
 */
const BROADCAST_CHUNK_SIZE = 500;

/**
 * Resolve a cohort to a sequence of user-id chunks. Each chunk is at
 * most BROADCAST_CHUNK_SIZE ids; the audience query is paged with
 * limit/offset so we never hold the whole cohort in memory at once.
 *
 * Active users only — suspended/deactivated/pending-verification
 * accounts are excluded so we don't leak broadcasts to users we've
 * explicitly cut off.
 */
async function* resolveAudienceChunks(
  audience: BroadcastAudience
): AsyncGenerator<string[], void, unknown> {
  if (audience === 'all') {
    yield* pageUserIds({ status: UserStatus.ACTIVE });
    return;
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
      return;
    }
    const userRoles = await UserRole.findAll({
      where: { roleId: { [Op.in]: roleIds } },
      attributes: ['userId'],
    });
    const candidateUserIds = [...new Set(userRoles.map(ur => ur.userId))];
    if (candidateUserIds.length === 0) {
      return;
    }
    yield* pageUserIds({
      userId: { [Op.in]: candidateUserIds },
      status: UserStatus.ACTIVE,
    });
    return;
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

  for await (const chunk of pageUserIds({ status: UserStatus.ACTIVE })) {
    const filtered = chunk.filter(id => !excludedUserIds.has(id));
    if (filtered.length > 0) {
      yield filtered;
    }
  }
}

/**
 * Page over User ids matching `where`, yielding chunks of at most
 * BROADCAST_CHUNK_SIZE. Ordered by userId so paging is stable.
 */
async function* pageUserIds(where: WhereOptions): AsyncGenerator<string[], void, unknown> {
  let offset = 0;
  for (;;) {
    const users = await User.findAll({
      where,
      attributes: ['userId'],
      order: [['userId', 'ASC']],
      limit: BROADCAST_CHUNK_SIZE,
      offset,
    });
    if (users.length === 0) {
      return;
    }
    yield users.map(u => u.userId);
    if (users.length < BROADCAST_CHUNK_SIZE) {
      return;
    }
    offset += BROADCAST_CHUNK_SIZE;
  }
}

/**
 * Count the resolved audience without materialising every id at once —
 * used by previewAudienceCount.
 */
async function countAudience(audience: BroadcastAudience): Promise<number> {
  let total = 0;
  for await (const chunk of resolveAudienceChunks(audience)) {
    total += chunk.length;
  }
  return total;
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

    let targetCount = 0;
    let deliveredInApp = 0;
    let skippedByPrefs = 0;
    let skippedByDnd = 0;

    // In-app delivery is unconditional (the broadcast is the platform
    // telling the user something), but email/push/sms are gated by the
    // user's preferences and DND just like every other notification path.
    // This mirrors NotificationService.createNotification — we deliberately
    // don't bypass user prefs from the broadcast layer.
    const wantsExternalChannels = input.channels.some(c => c !== NotificationChannel.IN_APP);
    const deliversInApp = input.channels.includes(NotificationChannel.IN_APP);

    // Fan out in bounded chunks: the audience is paged and each chunk's
    // in-app rows are written with a single bulkCreate, so memory and the
    // number of INSERTs stay bounded regardless of platform size.
    for await (const userIds of resolveAudienceChunks(input.audience)) {
      targetCount += userIds.length;

      const createdInChunk = await persistInAppChunk(userIds, input);
      if (deliversInApp) {
        deliveredInApp += createdInChunk.length;
      }

      if (!wantsExternalChannels) {
        continue;
      }

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

      // External channel delivery respects per-user prefs and DND. The
      // in-app rows above are unconditional — they're a record of the
      // platform announcement, distinct from push/email/SMS reach.
      for (const created of createdInChunk) {
        try {
          const userPrefs = await loadPrefsForBroadcast(created.user_id);

          if (NotificationChannelService.isInQuietHours(userPrefs)) {
            skippedByDnd += 1;
            continue;
          }

          const allowedChannels = await NotificationChannelService.getDeliveryChannels(
            created.user_id,
            NotificationType.SYSTEM_ANNOUNCEMENT,
            'normal'
          );
          const toDeliver = requestedExternal.filter(c => allowedChannels.includes(c));

          if (toDeliver.length === 0 && requestedExternal.length > 0) {
            skippedByPrefs += 1;
            continue;
          }

          await NotificationChannelService.deliverToChannels(
            {
              userId: created.user_id,
              title: input.title,
              message: input.body,
              type: NotificationType.SYSTEM_ANNOUNCEMENT,
              data: { notificationId: created.notification_id },
              priority: 'normal',
            },
            toDeliver
          );
        } catch (err) {
          logger.error('[broadcast] per-user external delivery failed', {
            userId: created.user_id,
            err: err instanceof Error ? err.message : String(err),
          });
        }
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
    return countAudience(audience);
  }
}

/**
 * Persist one in-app Notification row per recipient in a single
 * bulkCreate, returning the created instances (which carry the
 * generated notification_id needed for external-channel delivery
 * metadata). Replaces the previous per-user Notification.create N+1.
 */
async function persistInAppChunk(
  userIds: string[],
  input: BroadcastInput
): Promise<Notification[]> {
  const now = new Date();
  return Notification.bulkCreate(
    userIds.map(userId => ({
      user_id: userId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: input.title,
      message: input.body,
      priority: NotificationPriority.NORMAL,
      channel: NotificationChannel.IN_APP,
      created_at: now,
    }))
  );
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
