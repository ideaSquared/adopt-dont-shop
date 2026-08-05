// event_outbox — the transactional outbox for this service's schema
// (ADS-1048). The table DDL lives once in @adopt-dont-shop/events and is
// re-exported here so its columns stay in lock-step with the relay/insert SQL
// that reads them. `withTransaction` stages every domain event as a row in
// this table inside the business transaction, and the outbox relay (started at
// boot) drains it to JetStream. See packages/events/src/outbox-schema.ts.
export { up, down } from '@adopt-dont-shop/events/outbox-schema';
