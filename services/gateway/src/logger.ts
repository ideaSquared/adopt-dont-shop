import { BASE_LOG_FIELDS, type Logger } from '@adopt-dont-shop/observability';

// Every field service.gateway may log. Identifiers, counts and route paths only: never a client
// IP, header, cookie, token, request or response body. `route` is the framework's route pattern,
// or the fixed value 'unmatched'; a raw request path is never logged.
export const LOG_FIELDS = [
  ...BASE_LOG_FIELDS,
  'origins',
  'socketId',
  'cap',
  'bucketSize',
  'event',
  'widgetId',
  'metric',
] as const;

export type ServiceLogger = Logger<(typeof LOG_FIELDS)[number]>;
