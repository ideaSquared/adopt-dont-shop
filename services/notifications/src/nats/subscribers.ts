// Cross-service NATS subscribers — the translation layer between
// upstream domain events (applications.submitted, applications.approved,
// applications.rejected) and the user-facing notification rows the
// gRPC layer also creates.
//
// Discipline:
//
//   - Each handler invokes createNotification with the SYSTEM_PRINCIPAL
//     so the permission gate short-circuits. No new SQL paths — every
//     notification still goes through the canonical handler.
//   - @adopt-dont-shop/events.subscribe wraps each callback with the
//     CAD-#4 poison-pill protection: handler exceptions are reported
//     via onError, the loop continues, malformed JSON is a clean skip.
//   - Subscribers share a NATS queue group ('notifications-workers')
//     so horizontally-scaled replicas share work — only one replica
//     receives each event copy.
//   - registerSubscribers returns the Subscription handles so callers
//     can drain them explicitly if needed; the index.ts shutdown path
//     drains the whole NatsConnection which handles this transitively.
//
// Idempotency note: this commit does NOT dedupe by event id. Phase 1.4b
// adds a processed_events(event_id PK) table so the same upstream event
// redelivered (network retry, JetStream replay) doesn't create two
// notification rows. For now the canonical handler's INSERT generates
// a fresh notification_id per call.

import type { NatsConnection, Subscription } from 'nats';
import type { Logger } from 'winston';

import { subscribe } from '@adopt-dont-shop/events';

import { NotificationsV1, type CreateNotificationRequest } from '@adopt-dont-shop/proto';

import { createNotification, type HandlerDeps } from '../grpc/handlers.js';

import type {
  ApplicationApprovedEvent,
  ApplicationRejectedEvent,
  ApplicationSubmittedEvent,
  AuthRoleAssignedEvent,
  AuthUserLoggedInEvent,
  PetDeletedEvent,
  PetStatusChangedEvent,
  RescueRejectedEvent,
  RescueStaffInvitedEvent,
  RescueVerifiedEvent,
} from './event-types.js';
import { SYSTEM_PRINCIPAL } from './system-principal.js';

export type RegisterSubscribersOptions = {
  nats: NatsConnection;
  deps: HandlerDeps;
  logger: Logger;
};

// Single queue group so multiple replicas of service.notifications
// share work — NATS delivers each message to exactly one subscriber in
// the group. The string is part of the deployment contract; changing
// it elsewhere means duplicate handling during the rollover.
const QUEUE_GROUP = 'notifications-workers';

export const registerSubscribers = (opts: RegisterSubscribersOptions): Subscription[] => {
  const { nats, deps, logger } = opts;

  const onError = (err: unknown, ctx: { subject: string }): void => {
    logger.error('subscriber handler failed', {
      subject: ctx.subject,
      err: (err as Error)?.message ?? String(err),
    });
  };

  const subscriptions: Subscription[] = [];

  subscriptions.push(
    subscribe<ApplicationSubmittedEvent>(
      nats,
      { subject: 'applications.submitted', queue: QUEUE_GROUP, onError },
      async payload => {
        await createNotification(deps, SYSTEM_PRINCIPAL, buildApplicationSubmittedCreate(payload));
      }
    )
  );

  subscriptions.push(
    subscribe<ApplicationApprovedEvent>(
      nats,
      { subject: 'applications.approved', queue: QUEUE_GROUP, onError },
      async payload => {
        await createNotification(deps, SYSTEM_PRINCIPAL, buildApplicationApprovedCreate(payload));
      }
    )
  );

  subscriptions.push(
    subscribe<ApplicationRejectedEvent>(
      nats,
      { subject: 'applications.rejected', queue: QUEUE_GROUP, onError },
      async payload => {
        await createNotification(deps, SYSTEM_PRINCIPAL, buildApplicationRejectedCreate(payload));
      }
    )
  );

  subscriptions.push(
    subscribe<AuthUserLoggedInEvent>(
      nats,
      { subject: 'auth.userLoggedIn', queue: QUEUE_GROUP, onError },
      async payload => {
        await createNotification(deps, SYSTEM_PRINCIPAL, buildAuthUserLoggedInCreate(payload));
      }
    )
  );

  subscriptions.push(
    subscribe<AuthRoleAssignedEvent>(
      nats,
      { subject: 'auth.roleAssigned', queue: QUEUE_GROUP, onError },
      async payload => {
        await createNotification(deps, SYSTEM_PRINCIPAL, buildAuthRoleAssignedCreate(payload));
      }
    )
  );

  // pets.statusChanged / pets.deleted (Phase 3.4): the subjects are
  // wired here so the wire path is exercised end-to-end, but we do
  // not yet create user-facing notification rows — see event-types.ts
  // for the recipient-discovery deferral. Subscribing keeps the
  // contract anchored on the consumer side and means upcoming changes
  // (rescue staff lookup, favourite fan-out) only need to fill in the
  // translator, not the registration.
  subscriptions.push(
    subscribe<PetStatusChangedEvent>(
      nats,
      { subject: 'pets.statusChanged', queue: QUEUE_GROUP, onError },
      async payload => {
        logger.info('pets.statusChanged received', {
          petId: payload.petId,
          rescueId: payload.rescueId,
          fromStatus: payload.fromStatus,
          toStatus: payload.toStatus,
        });
      }
    )
  );

  subscriptions.push(
    subscribe<PetDeletedEvent>(
      nats,
      { subject: 'pets.deleted', queue: QUEUE_GROUP, onError },
      async payload => {
        logger.info('pets.deleted received', {
          petId: payload.petId,
          rescueId: payload.rescueId,
        });
      }
    )
  );

  // rescue.verified / rescue.rejected / rescue.staffInvited (Phase 4.4):
  // log-only on the consumer side, same pattern as the pets.* events.
  // Recipient-discovery (rescue.contact_person, invitee email worker)
  // lands when those upstream lookups exist.
  subscriptions.push(
    subscribe<RescueVerifiedEvent>(
      nats,
      { subject: 'rescue.verified', queue: QUEUE_GROUP, onError },
      async payload => {
        logger.info('rescue.verified received', {
          rescueId: payload.rescueId,
          fromStatus: payload.fromStatus,
          toStatus: payload.toStatus,
        });
      }
    )
  );

  subscriptions.push(
    subscribe<RescueRejectedEvent>(
      nats,
      { subject: 'rescue.rejected', queue: QUEUE_GROUP, onError },
      async payload => {
        logger.info('rescue.rejected received', {
          rescueId: payload.rescueId,
          reason: payload.reason,
        });
      }
    )
  );

  subscriptions.push(
    subscribe<RescueStaffInvitedEvent>(
      nats,
      { subject: 'rescue.staffInvited', queue: QUEUE_GROUP, onError },
      async payload => {
        logger.info('rescue.staffInvited received', {
          invitationId: payload.invitationId,
          rescueId: payload.rescueId,
          email: payload.email,
        });
      }
    )
  );

  logger.info('NATS subscribers registered', {
    subjects: subscriptions.length,
    queue: QUEUE_GROUP,
  });

  return subscriptions;
};

// --- Translation: domain event → CreateNotificationRequest ----------
//
// Pure functions, exported so they're testable in isolation without
// spinning up NATS. The runtime path is `event → translate → handler`;
// asserting the translation here is the cheapest signal for "we set
// the right type/channel/title for this event".

export const buildApplicationSubmittedCreate = (
  event: ApplicationSubmittedEvent
): CreateNotificationRequest => ({
  userId: event.adopterId as string,
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
  title: 'Application received',
  message: 'Your application has been submitted and is awaiting review.',
  dataJson: JSON.stringify({
    applicationId: event.applicationId,
    petId: event.petId,
    rescueId: event.rescueId,
  }),
  templateVariablesJson: '{}',
  relatedEntityType:
    NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_APPLICATION,
  relatedEntityId: event.applicationId,
});

export const buildApplicationApprovedCreate = (
  event: ApplicationApprovedEvent
): CreateNotificationRequest => ({
  userId: event.adopterId as string,
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_ADOPTION_APPROVED,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  // Approvals are a big deal — bump priority so the in-app pinger
  // takes notice. Email channel will fire from a sibling worker on the
  // same event.
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_HIGH,
  title: 'Application approved! 🎉',
  message: 'Your application has been approved. Next steps will follow shortly.',
  dataJson: JSON.stringify({
    applicationId: event.applicationId,
    petId: event.petId,
    rescueId: event.rescueId,
  }),
  templateVariablesJson: '{}',
  relatedEntityType:
    NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_APPLICATION,
  relatedEntityId: event.applicationId,
});

export const buildApplicationRejectedCreate = (
  event: ApplicationRejectedEvent
): CreateNotificationRequest => ({
  userId: event.adopterId as string,
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_ADOPTION_REJECTED,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
  title: 'Application update',
  message: event.reason
    ? `Your application was not approved. Reason: ${event.reason}`
    : 'Your application was not approved.',
  dataJson: JSON.stringify({
    applicationId: event.applicationId,
    petId: event.petId,
    rescueId: event.rescueId,
    reason: event.reason ?? null,
  }),
  templateVariablesJson: '{}',
  relatedEntityType:
    NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_APPLICATION,
  relatedEntityId: event.applicationId,
});

// auth.userLoggedIn — security notification. We surface the IP +
// user agent so the user can spot unrecognised sign-ins; the message
// stays generic when neither is supplied (the gateway may strip these
// in dev / local).
export const buildAuthUserLoggedInCreate = (
  event: AuthUserLoggedInEvent
): CreateNotificationRequest => {
  const where = event.ipAddress ?? 'an unknown location';
  const how = event.userAgent ? ` (${event.userAgent})` : '';
  return {
    userId: event.userId as string,
    type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_ACCOUNT_SECURITY,
    channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
    priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_LOW,
    title: 'New sign-in to your account',
    message: `We detected a new sign-in from ${where}${how}. If this wasn't you, change your password immediately.`,
    dataJson: JSON.stringify({
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    }),
    templateVariablesJson: '{}',
    relatedEntityType:
      NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_SECURITY,
  };
};

// auth.roleAssigned — in-app announcement of the new role + a hint
// about the new affordances. The role string is the canonical DB
// value (`adopter`, `rescue_staff`, etc.) — keep it as-is so the
// frontend can render a label/icon from a lookup table.
export const buildAuthRoleAssignedCreate = (
  event: AuthRoleAssignedEvent
): CreateNotificationRequest => ({
  userId: event.targetUserId as string,
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_STAFF_ASSIGNMENT,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
  title: 'New role assigned',
  message: event.reason
    ? `You have been granted the ${event.role} role. Reason: ${event.reason}`
    : `You have been granted the ${event.role} role.`,
  dataJson: JSON.stringify({
    role: event.role,
    assignedBy: event.assignedBy,
    reason: event.reason,
  }),
  templateVariablesJson: '{}',
  relatedEntityType:
    NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_USER,
});
