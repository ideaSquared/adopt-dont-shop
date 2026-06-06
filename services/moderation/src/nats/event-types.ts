// Type shapes for the cross-service domain events service.moderation
// consumes to seed auto-reports. Mirrors what each publisher emits.
//
// Producer-side proto types aren't shared yet — these consumer-side
// shapes document the contract the upstream service is expected to
// honour, and give us a single place to fix a mismatch when one drifts.

import type { UserId } from '@adopt-dont-shop/lib.types';

// chat.messageCreated — service.chat publishes after a message lands.
// Used for auto-report triggers on inappropriate text content.
export type ChatMessageCreatedEvent = {
  messageId: string;
  chatId: string;
  senderId: UserId;
  content: string;
};

// pets.created — service.pets publishes after a new pet record is
// inserted. Used to scan the listing's short/long descriptions for
// disallowed content (e.g. solicitation, scam patterns).
export type PetCreatedEvent = {
  petId: string;
  rescueId: string | null;
  // The pet's user-supplied free text. Either or both may be empty.
  shortDescription?: string | null;
  longDescription?: string | null;
};

// applications.submitted — used to scan adopter-supplied free text in
// the application answers blob for disallowed patterns. This payload
// is also consumed by service.notifications (different reason).
export type ApplicationSubmittedEvent = {
  applicationId: string;
  adopterId: UserId;
  petId: string;
  rescueId: string;
  submittedAt: string;
  // The free-text fields the scanner inspects. The publisher serialises
  // the relevant subset from answers to keep payloads bounded; both
  // optional so an older publisher without them still parses cleanly.
  message?: string;
  whyAdopt?: string;
};
