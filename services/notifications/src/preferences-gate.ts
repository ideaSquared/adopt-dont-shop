// Preference gate for OUTBOUND delivery channels.
//
// The in-app notification row is the user's durable record and is always
// written (createNotification). These preferences govern the INTERRUPTIVE
// channels — push now, email once the email channel adapter lands — so a
// user who disabled push, muted a category, or set quiet hours stops
// getting those channels WITHOUT losing their in-app history. Stored prefs
// (user_notification_prefs) were previously editable but never consulted
// at dispatch; this is the consult point.

import type { Pool } from 'pg';

export type DeliveryChannel = 'in_app' | 'email' | 'push' | 'sms';

export type NotificationPrefs = {
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  applicationUpdates: boolean;
  petMatches: boolean;
  rescueUpdates: boolean;
  chatMessages: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
};

// Permissive defaults — mirror the user_notification_prefs column defaults.
// Used when a user has no prefs row yet (the row is created lazily by the
// prefs RPCs, so a brand-new user has none).
export const DEFAULT_PREFS: NotificationPrefs = {
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  applicationUpdates: true,
  petMatches: true,
  rescueUpdates: true,
  chatMessages: true,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: 'UTC',
};

type PrefsRow = {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  application_updates: boolean;
  pet_matches: boolean;
  rescue_updates: boolean;
  chat_messages: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
};

export const loadNotificationPrefs = async (
  pool: Pool,
  userId: string
): Promise<NotificationPrefs> => {
  const res = await pool.query<PrefsRow>(
    `SELECT email_enabled, push_enabled, sms_enabled,
            application_updates, pet_matches, rescue_updates, chat_messages,
            quiet_hours_start, quiet_hours_end, timezone
     FROM notifications.user_notification_prefs
     WHERE user_id = $1`,
    [userId]
  );
  const row = res.rows[0];
  if (!row) {
    return DEFAULT_PREFS;
  }
  return {
    emailEnabled: row.email_enabled,
    pushEnabled: row.push_enabled,
    smsEnabled: row.sms_enabled,
    applicationUpdates: row.application_updates,
    petMatches: row.pet_matches,
    rescueUpdates: row.rescue_updates,
    chatMessages: row.chat_messages,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    timezone: row.timezone,
  };
};

// Map a notification type (the lowercase Postgres enum value) to the
// category toggle that governs it. Types with no category (account
// security, system announcements, reminders, marketing) are never
// category-muted — account_security in particular must always reach the
// user.
const categoryEnabled = (prefs: NotificationPrefs, type: string): boolean => {
  switch (type) {
    case 'application_status':
    case 'adoption_approved':
    case 'adoption_rejected':
    case 'home_visit_scheduled':
    case 'interview_scheduled':
    case 'reference_request':
    case 'follow_up':
      return prefs.applicationUpdates;
    case 'pet_available':
    case 'pet_update':
      return prefs.petMatches;
    case 'rescue_invitation':
    case 'staff_assignment':
      return prefs.rescueUpdates;
    case 'message_received':
      return prefs.chatMessages;
    default:
      return true;
  }
};

const channelEnabled = (prefs: NotificationPrefs, channel: DeliveryChannel): boolean => {
  switch (channel) {
    case 'email':
      return prefs.emailEnabled;
    case 'push':
      return prefs.pushEnabled;
    case 'sms':
      return prefs.smsEnabled;
    case 'in_app':
      return true;
  }
};

const toMinutes = (hhmmss: string): number => {
  const [h, m] = hhmmss.split(':');
  return Number(h) * 60 + Number(m);
};

const minutesOfDayInTz = (now: Date, timezone: string): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now);
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
};

// Quiet hours apply only to interruptive channels (push). A window that
// wraps midnight (start > end, e.g. 22:00 → 07:00) is handled.
export const inQuietHours = (prefs: NotificationPrefs, now: Date): boolean => {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) {
    return false;
  }
  const start = toMinutes(prefs.quietHoursStart);
  const end = toMinutes(prefs.quietHoursEnd);
  if (start === end) {
    return false;
  }
  const current = minutesOfDayInTz(now, prefs.timezone || 'UTC');
  return start < end ? current >= start && current < end : current >= start || current < end;
};

export type DeliveryDecision = { type: string; channel: DeliveryChannel; now: Date };

// Whether to deliver a notification of `type` on `channel` to a user with
// these prefs at `now`. in_app is always allowed (the durable record);
// push/email/sms require the channel enabled AND the category un-muted, and
// push additionally respects quiet hours.
export const shouldDeliver = (prefs: NotificationPrefs, args: DeliveryDecision): boolean => {
  if (args.channel === 'in_app') {
    return true;
  }
  if (!channelEnabled(prefs, args.channel)) {
    return false;
  }
  if (!categoryEnabled(prefs, args.type)) {
    return false;
  }
  if (args.channel === 'push' && inQuietHours(prefs, args.now)) {
    return false;
  }
  return true;
};
