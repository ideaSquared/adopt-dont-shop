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
