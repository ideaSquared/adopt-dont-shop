// Shared schemas for the GDPR erasure saga.
//
// Flow:
//   1. Gateway publishes `gdpr.erasureRequested` with { userId, correlationId,
//      requestedAt }.
//   2. Every service that owns user-keyed data subscribes and erases its
//      slice (delete / soft-delete / anonymise — service's choice based
//      on its retention rules).
//   3. After erasing, each service publishes `gdpr.erasureCompleted` with
//      { userId, correlationId, service, recordsErased, completedAt }.
//   4. service.audit aggregates request + completion rows in
//      `audit.gdpr_erasure_requests` for the data-controller's records.
//
// The two event types are kept together here so every service consumes
// the same shape — there's exactly one source of truth for the field names.

export const GDPR_ERASURE_REQUESTED = 'gdpr.erasureRequested';
export const GDPR_ERASURE_COMPLETED = 'gdpr.erasureCompleted';

export type GdprErasureRequestedPayload = {
  // The user being erased — primary key in auth.users.
  userId: string;
  // The user's email, resolved by the gateway from the auth record at
  // request time. Optional because not every erasure has a resolvable
  // email (e.g. the auth lookup failed). Consumers use it to erase
  // email-keyed rows that carry no user_id — notably rescue pending
  // invitations for a user who never registered. This deliberately
  // broadcasts the email on the erasure event: the whole purpose of the
  // event is erasure, so the scoped PII spread is the accepted tradeoff
  // for erasure completeness.
  email?: string;
  // Saga-wide correlation id. Mint at the gateway; every subscriber
  // echoes it on its completion event so the audit consumer can join.
  correlationId: string;
  // RFC 3339 timestamp the gateway recorded the request at.
  requestedAt: string;
  // Optional free-text reason the user supplied (e.g. "moving to a
  // different country"). Stored verbatim in the audit row.
  reason?: string;
};

export type GdprErasureCompletedPayload = {
  userId: string;
  correlationId: string;
  // Short service name. Examples: 'auth', 'notifications', 'pets'.
  service: string;
  // How many rows the subscriber touched. Useful in audit for sanity-
  // checking that all the obvious tables were affected. 0 is fine for
  // services where the user had no data.
  recordsErased: number;
  // RFC 3339 timestamp.
  completedAt: string;
  // Optional human-readable error message — set when the subscriber
  // couldn't complete cleanly (the audit consumer surfaces this so an
  // operator can intervene). When unset, the completion is a success.
  error?: string;
};
