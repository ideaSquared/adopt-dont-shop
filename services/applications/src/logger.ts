import { BASE_LOG_FIELDS, type Logger } from '@adopt-dont-shop/observability';

// Every field service.applications may log. Identifiers and counts only.
export const LOG_FIELDS = [
  ...BASE_LOG_FIELDS,
  'applicationId',
  'applicationsProcessed',
  'eventsInserted',
  'skipped',
] as const;

export type ServiceLogger = Logger<(typeof LOG_FIELDS)[number]>;
