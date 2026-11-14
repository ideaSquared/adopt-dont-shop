import { BASE_LOG_FIELDS, type Logger } from '@adopt-dont-shop/observability';

// Every field service.notifications may log. Identifiers and counts only: never an address, a
// recipient name, a subject, a title or body, or a device token.
export const LOG_FIELDS = [
  ...BASE_LOG_FIELDS,
  'petId',
  'chatId',
  'messageId',
  'invitationId',
  'role',
  'sendInvitation',
  'recipientUserId',
  'previousUserId',
  'newUserId',
  'platform',
  'code',
  'queueId',
  'notificationId',
  'pushDeviceId',
  'deviceInvalid',
  'type',
  'priority',
  'attachmentCount',
  'hasData',
  'deletedCount',
  'cohortSize',
  'consented',
  'sent',
  'skippedEmpty',
  'failed',
  'hasAuthClient',
  'hasPetsClient',
  'hasApplicationsClient',
  'durablePrefix',
] as const;

export type ServiceLogger = Logger<(typeof LOG_FIELDS)[number]>;
