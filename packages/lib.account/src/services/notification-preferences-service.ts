import { apiService } from '@adopt-dont-shop/lib.api';
import { z } from 'zod';

/**
 * The calling user's notification preferences, as served by the gateway at
 * /api/v1/notifications/preferences (services/gateway/src/routes/notifications.ts).
 *
 * The GET response is the proto `NotificationPreferences` message run through
 * ts-proto's toJSON, which has two quirks this schema absorbs:
 * - `false` booleans are omitted, so a missing flag means "off".
 * - `digestFrequency` is the enum name (`NOTIFICATION_DIGEST_FREQUENCY_DAILY`).
 * Quiet hours come straight from a Postgres `time` column (`22:00:00`), but the
 * update handler only accepts `HH:MM`, so they are trimmed on read.
 */

export const DIGEST_FREQUENCIES = ['immediate', 'daily', 'weekly', 'never'] as const;
export type DigestFrequency = (typeof DIGEST_FREQUENCIES)[number];

// The user_notification_prefs column default.
const DEFAULT_DIGEST_FREQUENCY: DigestFrequency = 'weekly';
const DEFAULT_TIMEZONE = 'Europe/London';
const PROTO_FREQUENCY_PREFIX = 'NOTIFICATION_DIGEST_FREQUENCY_';

const toDigestFrequency = (raw: string | undefined): DigestFrequency =>
  DIGEST_FREQUENCIES.find(
    frequency =>
      raw?.toLowerCase() === frequency ||
      raw === `${PROTO_FREQUENCY_PREFIX}${frequency.toUpperCase()}`
  ) ?? DEFAULT_DIGEST_FREQUENCY;

const toHoursMinutes = (raw: string | undefined): string => raw?.slice(0, 5) ?? '';

const flag = z.boolean().optional().default(false);

const GatewayPreferencesSchema = z
  .object({
    emailEnabled: flag,
    pushEnabled: flag,
    smsEnabled: flag,
    applicationUpdates: flag,
    petMatches: flag,
    rescueUpdates: flag,
    chatMessages: flag,
    digestFrequency: z.string().optional(),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional(),
    timezone: z.string().optional(),
  })
  .transform(raw => ({
    emailEnabled: raw.emailEnabled,
    pushEnabled: raw.pushEnabled,
    smsEnabled: raw.smsEnabled,
    applicationUpdates: raw.applicationUpdates,
    petMatches: raw.petMatches,
    rescueUpdates: raw.rescueUpdates,
    chatMessages: raw.chatMessages,
    digestFrequency: toDigestFrequency(raw.digestFrequency),
    quietHoursStart: toHoursMinutes(raw.quietHoursStart),
    quietHoursEnd: toHoursMinutes(raw.quietHoursEnd),
    timezone: raw.timezone || DEFAULT_TIMEZONE,
  }));

const PreferencesEnvelopeSchema = z.object({ data: GatewayPreferencesSchema });

export type NotificationPreferences = z.infer<typeof GatewayPreferencesSchema>;

const PREFERENCES_URL = '/api/v1/notifications/preferences';

export const fetchNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const raw = await apiService.get<unknown>(PREFERENCES_URL);
  return PreferencesEnvelopeSchema.parse(raw).data;
};

/**
 * The gateway's PUT accepts these field names as-is (buildPrefsPatch), maps a
 * lower-case `digestFrequency` onto the proto enum, and treats an empty quiet
 * hours string as "clear".
 */
export const updateNotificationPreferences = async (
  preferences: NotificationPreferences
): Promise<NotificationPreferences> => {
  const raw = await apiService.put<unknown>(PREFERENCES_URL, preferences);
  return PreferencesEnvelopeSchema.parse(raw).data;
};
