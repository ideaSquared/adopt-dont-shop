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

// applications.homeVisitScheduled — service.applications emits when
// rescue staff schedule the home visit. The adopter needs the date, so
// this is a HIGH-priority in-app ping; the timestamp rides in data_json
// for the SPA to format.
export type ApplicationHomeVisitScheduledEvent = {
  applicationId: string;
  adopterId: UserId;
  rescueId: string;
  scheduledAt: string; // RFC 3339
};

// applications.homeVisitCompleted — emitted when staff record the visit
// outcome. The adopter is told the visit is done (not the pass/fail
// outcome, which stays in data_json for the dashboard to render with the
// right framing).
export type ApplicationHomeVisitCompletedEvent = {
  applicationId: string;
  adopterId: UserId;
  rescueId: string;
  outcome: string;
};

// applications.adopted — the final lifecycle event (pet collected /
// adoption finalised). A celebratory HIGH-priority notification to the
// adopter.
export type ApplicationAdoptedEvent = {
  applicationId: string;
  adopterId: UserId;
  petId: string;
  rescueId: string;
};

// auth.userLoggedIn — service.auth publishes after every successful
// login (Phase 2.3b). service.notifications surfaces a security
// notification so the user can spot unrecognised sign-ins. Mirrors
// what GitHub / Google account-security emails do — the in-app
// channel is the cheapest first cut; an email worker can subscribe to
// the same subject later for an additional channel.
export type AuthUserLoggedInEvent = {
  userId: UserId;
  ipAddress: string | null;
  userAgent: string | null;
};

// auth.roleAssigned — service.auth publishes when an admin grants a
// user a role (e.g. promotes an adopter to rescue_staff). The user
// gets an in-app notification announcing the new role + a hint about
// the new affordances.
export type AuthRoleAssignedEvent = {
  targetUserId: UserId;
  role: string;
  assignedBy: UserId;
  reason: string | null;
};

// pets.statusChanged — service.pets publishes after every successful
// status transition (Phase 3.3b). Payload carries the pet + rescue +
// from/to status pair + optional reason; transitionedBy lives on the
// pet_status_transitions row but is not yet in the NATS payload.
//
// Phase 3.4: this service subscribes to the subject but does NOT yet
// create user-facing notifications — recipient discovery (rescue staff,
// users who favourited the pet) requires gRPC lookups into the rescue
// + pets verticals that don't exist yet (Phases 4 + 9). The subscriber
// logs receipt so we can confirm the wire path end-to-end + the contract
// stays anchored here.
export type PetStatusChangedEvent = {
  petId: string;
  rescueId: string | null;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
};

// pets.deleted — service.pets publishes after soft-delete. Same
// log-only treatment as pets.statusChanged for the same reason
// (no recipient yet derivable in this service).
export type PetDeletedEvent = {
  petId: string;
  rescueId: string | null;
};

// rescue.verified — service.rescue publishes after an admin verifies
// a rescue (Phase 4.3b). Payload carries the from/to status pair so
// downstream subscribers can pick out the verified-from-pending case
// vs the reinstate-from-suspended case.
//
// Phase 4.4: log-only on the consumer side. Surfacing a user-facing
// notification needs recipient discovery (the rescue's contact_person /
// created_by) — same recipient-discovery deferral as pets.statusChanged.
export type RescueVerifiedEvent = {
  rescueId: string;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
};

// rescue.rejected — service.rescue publishes when an admin rejects a
// pending application. Payload mirrors RescueVerifiedEvent (same
// emit shape on the rescue side).
export type RescueRejectedEvent = {
  rescueId: string;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
};

// rescue.staffInvited — service.rescue publishes when InviteStaff
// mints + persists an invitation row (Phase 4.3b). Includes the
// invitee email so an email worker can dispatch the invite token.
// The plain-text token itself is NOT in the payload (it's returned
// in the InviteStaffResponse and never persisted in NATS).
export type RescueStaffInvitedEvent = {
  invitationId: string;
  rescueId: string;
  email: string;
  invitedBy: string;
  expiration: string;
};

// chat.messageCreated — service.chat publishes after every committed
// message insert. Payload mirrors what the gateway WS subscriber
// already consumes; the notifications subscriber uses
// `participantUserIds` to fan out an in-app NOTIFICATION_TYPE_MESSAGE_RECEIVED
// row per recipient (sender excluded — they don't need to be told
// about their own message).
export type ChatMessageCreatedEvent = {
  messageId: string;
  chatId: string;
  senderUserId: string;
  body: string;
  participantUserIds: string[];
};
