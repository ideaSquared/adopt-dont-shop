import { BASE_LOG_FIELDS, type Logger } from '@adopt-dont-shop/observability';

// Every field service.ops may log. Operators are identified by id, never by GitHub login.
export const LOG_FIELDS = [
  ...BASE_LOG_FIELDS,
  'operatorId',
  'rpc',
  'kind',
  'mode',
  'outcome',
  'revealedFieldCount',
  'ticket',
  'subjectType',
  'opsEnv',
  'authMode',
  'unlocksEnabled',
] as const;

export type ServiceLogger = Logger<(typeof LOG_FIELDS)[number]>;
