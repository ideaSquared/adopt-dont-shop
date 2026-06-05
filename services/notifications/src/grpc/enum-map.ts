// Bidirectional maps between the notification proto3 enums (numeric
// values, SCREAMING_SNAKE_CASE names) and the Postgres ENUM string
// values defined in src/migrations/001_create_notifications.ts.
//
// The handler sits at the boundary: read from gRPC (proto enums), write
// to Postgres (string values), read from Postgres (string values), write
// to gRPC (proto enums). Each direction is one of these functions.

import { NotificationsV1 } from '@adopt-dont-shop/proto';

const {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationRelatedEntityType,
} = NotificationsV1;

// --- NotificationType ------------------------------------------------

const _TYPE_DB_VALUES = [
  'application_status',
  'message_received',
  'pet_available',
  'interview_scheduled',
  'home_visit_scheduled',
  'adoption_approved',
  'adoption_rejected',
  'reference_request',
  'system_announcement',
  'account_security',
  'reminder',
  'marketing',
  'rescue_invitation',
  'staff_assignment',
  'pet_update',
  'follow_up',
] as const;

export type NotificationTypeDb = (typeof _TYPE_DB_VALUES)[number];

const TYPE_DB_TO_PROTO: Record<NotificationTypeDb, NotificationsV1.NotificationType> = {
  application_status: NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS,
  message_received: NotificationType.NOTIFICATION_TYPE_MESSAGE_RECEIVED,
  pet_available: NotificationType.NOTIFICATION_TYPE_PET_AVAILABLE,
  interview_scheduled: NotificationType.NOTIFICATION_TYPE_INTERVIEW_SCHEDULED,
  home_visit_scheduled: NotificationType.NOTIFICATION_TYPE_HOME_VISIT_SCHEDULED,
  adoption_approved: NotificationType.NOTIFICATION_TYPE_ADOPTION_APPROVED,
  adoption_rejected: NotificationType.NOTIFICATION_TYPE_ADOPTION_REJECTED,
  reference_request: NotificationType.NOTIFICATION_TYPE_REFERENCE_REQUEST,
  system_announcement: NotificationType.NOTIFICATION_TYPE_SYSTEM_ANNOUNCEMENT,
  account_security: NotificationType.NOTIFICATION_TYPE_ACCOUNT_SECURITY,
  reminder: NotificationType.NOTIFICATION_TYPE_REMINDER,
  marketing: NotificationType.NOTIFICATION_TYPE_MARKETING,
  rescue_invitation: NotificationType.NOTIFICATION_TYPE_RESCUE_INVITATION,
  staff_assignment: NotificationType.NOTIFICATION_TYPE_STAFF_ASSIGNMENT,
  pet_update: NotificationType.NOTIFICATION_TYPE_PET_UPDATE,
  follow_up: NotificationType.NOTIFICATION_TYPE_FOLLOW_UP,
};

const TYPE_PROTO_TO_DB = invert(TYPE_DB_TO_PROTO);

export function typeFromDb(value: string): NotificationsV1.NotificationType {
  const result = TYPE_DB_TO_PROTO[value as NotificationTypeDb];
  if (result === undefined) {
    throw new Error(`unknown notification type from DB: ${value}`);
  }
  return result;
}

export function typeToDb(value: NotificationsV1.NotificationType): NotificationTypeDb {
  const result = TYPE_PROTO_TO_DB[value];
  if (!result) {
    throw new Error(`unknown notification type from proto: ${value}`);
  }
  return result as NotificationTypeDb;
}

// --- NotificationChannel ---------------------------------------------

const _CHANNEL_DB_VALUES = ['in_app', 'email', 'push', 'sms'] as const;
export type NotificationChannelDb = (typeof _CHANNEL_DB_VALUES)[number];

const CHANNEL_DB_TO_PROTO: Record<NotificationChannelDb, NotificationsV1.NotificationChannel> = {
  in_app: NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  email: NotificationChannel.NOTIFICATION_CHANNEL_EMAIL,
  push: NotificationChannel.NOTIFICATION_CHANNEL_PUSH,
  sms: NotificationChannel.NOTIFICATION_CHANNEL_SMS,
};

const CHANNEL_PROTO_TO_DB = invert(CHANNEL_DB_TO_PROTO);

export function channelFromDb(value: string): NotificationsV1.NotificationChannel {
  const result = CHANNEL_DB_TO_PROTO[value as NotificationChannelDb];
  if (result === undefined) {
    throw new Error(`unknown notification channel from DB: ${value}`);
  }
  return result;
}

export function channelToDb(value: NotificationsV1.NotificationChannel): NotificationChannelDb {
  const result = CHANNEL_PROTO_TO_DB[value];
  if (!result) {
    throw new Error(`unknown notification channel from proto: ${value}`);
  }
  return result as NotificationChannelDb;
}

// --- NotificationPriority --------------------------------------------

const _PRIORITY_DB_VALUES = ['low', 'normal', 'high', 'urgent'] as const;
export type NotificationPriorityDb = (typeof _PRIORITY_DB_VALUES)[number];

const PRIORITY_DB_TO_PROTO: Record<NotificationPriorityDb, NotificationsV1.NotificationPriority> = {
  low: NotificationPriority.NOTIFICATION_PRIORITY_LOW,
  normal: NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
  high: NotificationPriority.NOTIFICATION_PRIORITY_HIGH,
  urgent: NotificationPriority.NOTIFICATION_PRIORITY_URGENT,
};

const PRIORITY_PROTO_TO_DB = invert(PRIORITY_DB_TO_PROTO);

export function priorityFromDb(value: string): NotificationsV1.NotificationPriority {
  const result = PRIORITY_DB_TO_PROTO[value as NotificationPriorityDb];
  if (result === undefined) {
    throw new Error(`unknown notification priority from DB: ${value}`);
  }
  return result;
}

export function priorityToDb(value: NotificationsV1.NotificationPriority): NotificationPriorityDb {
  const result = PRIORITY_PROTO_TO_DB[value];
  if (!result) {
    throw new Error(`unknown notification priority from proto: ${value}`);
  }
  return result as NotificationPriorityDb;
}

// --- NotificationStatus ----------------------------------------------

const _STATUS_DB_VALUES = ['pending', 'sent', 'delivered', 'read', 'failed', 'cancelled'] as const;
export type NotificationStatusDb = (typeof _STATUS_DB_VALUES)[number];

const STATUS_DB_TO_PROTO: Record<NotificationStatusDb, NotificationsV1.NotificationStatus> = {
  pending: NotificationStatus.NOTIFICATION_STATUS_PENDING,
  sent: NotificationStatus.NOTIFICATION_STATUS_SENT,
  delivered: NotificationStatus.NOTIFICATION_STATUS_DELIVERED,
  read: NotificationStatus.NOTIFICATION_STATUS_READ,
  failed: NotificationStatus.NOTIFICATION_STATUS_FAILED,
  cancelled: NotificationStatus.NOTIFICATION_STATUS_CANCELLED,
};

const STATUS_PROTO_TO_DB = invert(STATUS_DB_TO_PROTO);

export function statusFromDb(value: string): NotificationsV1.NotificationStatus {
  const result = STATUS_DB_TO_PROTO[value as NotificationStatusDb];
  if (result === undefined) {
    throw new Error(`unknown notification status from DB: ${value}`);
  }
  return result;
}

export function statusToDb(value: NotificationsV1.NotificationStatus): NotificationStatusDb {
  const result = STATUS_PROTO_TO_DB[value];
  if (!result) {
    throw new Error(`unknown notification status from proto: ${value}`);
  }
  return result as NotificationStatusDb;
}

// --- NotificationRelatedEntityType -----------------------------------

const _RELATED_ENTITY_TYPE_DB_VALUES = [
  'application',
  'pet',
  'message',
  'user',
  'rescue',
  'conversation',
  'interview',
  'home_visit',
  'reminder',
  'announcement',
  'adoption',
  'event',
  'reference',
  'security',
] as const;
export type RelatedEntityTypeDb = (typeof _RELATED_ENTITY_TYPE_DB_VALUES)[number];

const RELATED_ENTITY_TYPE_DB_TO_PROTO: Record<
  RelatedEntityTypeDb,
  NotificationsV1.NotificationRelatedEntityType
> = {
  application: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_APPLICATION,
  pet: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_PET,
  message: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_MESSAGE,
  user: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_USER,
  rescue: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_RESCUE,
  conversation: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_CONVERSATION,
  interview: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_INTERVIEW,
  home_visit: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_HOME_VISIT,
  reminder: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_REMINDER,
  announcement: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_ANNOUNCEMENT,
  adoption: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_ADOPTION,
  event: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_EVENT,
  reference: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_REFERENCE,
  security: NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_SECURITY,
};

const RELATED_ENTITY_TYPE_PROTO_TO_DB = invert(RELATED_ENTITY_TYPE_DB_TO_PROTO);

export function relatedEntityTypeFromDb(
  value: string
): NotificationsV1.NotificationRelatedEntityType {
  const result = RELATED_ENTITY_TYPE_DB_TO_PROTO[value as RelatedEntityTypeDb];
  if (result === undefined) {
    throw new Error(`unknown notification related_entity_type from DB: ${value}`);
  }
  return result;
}

export function relatedEntityTypeToDb(
  value: NotificationsV1.NotificationRelatedEntityType
): RelatedEntityTypeDb {
  const result = RELATED_ENTITY_TYPE_PROTO_TO_DB[value];
  if (!result) {
    throw new Error(`unknown notification related_entity_type from proto: ${value}`);
  }
  return result as RelatedEntityTypeDb;
}

// --- helpers ---------------------------------------------------------

function invert<K extends string, V extends number>(obj: Record<K, V>): Record<number, K> {
  const out: Record<number, K> = {};
  for (const [k, v] of Object.entries(obj) as [K, V][]) {
    out[v] = k;
  }
  return out;
}
