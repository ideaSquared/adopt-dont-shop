// Type shapes for the cross-service domain events service.notifications
// translates into user-facing notifications.
//
// Each shape mirrors what the publishing service emits. The shapes
// live HERE (consumer-side) because the publisher's contract isn't a
// formal proto — it's a NATS subject + a JSON payload. Documenting the
// expected fields gives the subscriber a single place to mismatch
// against when a publisher drifts, plus a stable name for tests.
//
// Once the producing service ships its own @adopt-dont-shop/proto
// namespace (e.g. ApplicationsV1.ApplicationSubmittedEvent), these
// shapes will be replaced by the shared types. For now they're inline.

import type { UserId } from '@adopt-dont-shop/lib.types';

// applications.submitted — service.applications (Phase 5) emits when an
// adopter completes the application form. service.notifications
// announces it to the adopter ("Your application was received") and to
// rescue staff ("New application from <name>").
export type ApplicationSubmittedEvent = {
  applicationId: string;
  adopterId: UserId;
  petId: string;
  rescueId: string;
  submittedAt: string; // RFC 3339
};

// applications.approved — outcome on the adopter's application. Two
// downstream notifications: in-app + email (the email channel is
// handled by the workers Phase 1.4b will spawn off the same event).
export type ApplicationApprovedEvent = {
  applicationId: string;
  adopterId: UserId;
  petId: string;
  rescueId: string;
  approvedAt: string;
};

// applications.rejected — same shape, different translation.
export type ApplicationRejectedEvent = {
  applicationId: string;
  adopterId: UserId;
  petId: string;
  rescueId: string;
  rejectedAt: string;
  reason?: string;
};
