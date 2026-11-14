import { BASE_LOG_FIELDS, type Logger } from '@adopt-dont-shop/observability';

// Every field service.audit may log. Identifiers and counts only. `audit`, `action`, `outcome`,
// `actorUserId` and `aggregateType` are what the Grafana "Audit Events" dashboard groups by.
export const LOG_FIELDS = [
  ...BASE_LOG_FIELDS,
  'audit',
  'action',
  'outcome',
  'actorUserId',
  'aggregateType',
  'correlationId',
  'retryCount',
  'missingServices',
  'requestedAt',
  'msgId',
  'completedBy',
] as const;

export type ServiceLogger = Logger<(typeof LOG_FIELDS)[number]>;
