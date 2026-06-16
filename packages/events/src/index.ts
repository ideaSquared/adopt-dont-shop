export { withTransaction } from './publish.js';
export type { DomainEvent, TransactionalScope, WithTransactionDeps } from './publish.js';
export { subscribe } from './subscribe.js';
export type { MessageHandler, SubscribeOptions, SubscriptionHandle } from './subscribe.js';
export { ensureStream, DOMAIN_STREAM, DOMAIN_SUBJECTS } from './stream.js';
export type { DomainSubject } from './stream.js';
export {
  GDPR_ERASURE_REQUESTED,
  GDPR_ERASURE_COMPLETED,
  EXPECTED_GDPR_SERVICES,
  type GdprErasureRequestedPayload,
  type GdprErasureCompletedPayload,
} from './gdpr.js';
export { registerGdprSubscriber } from './gdpr-saga.js';
export type { GdprEraseFn, RegisterGdprSubscriberOptions } from './gdpr-saga.js';
export { redactAuditPayload } from './redact-audit-payload.js';
export { claimEvent } from './idempotency.js';
export type { DedupConn } from './idempotency.js';
export { CONSUMER_REGISTRY } from './consumer-registry.js';
export type { ConsumerEntry, RegistryEntry, ZeroConsumerEntry } from './consumer-registry.js';
