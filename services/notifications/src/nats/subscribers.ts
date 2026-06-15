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

import type { NatsConnection } from 'nats';
import type { Logger } from 'winston';

import { subscribe, type SubscriptionHandle } from '@adopt-dont-shop/events';

import { NotificationsV1, type CreateNotificationRequest } from '@adopt-dont-shop/proto';

import { createNotification, type HandlerDeps } from '../grpc/handlers.js';
import type { PetsFavoritersClient } from '../grpc/pets-client.js';
import type { RescueStaffClient } from '../grpc/rescue-client.js';

import type {
  ApplicationAdoptedEvent,
  ApplicationApprovedEvent,
  ApplicationHomeVisitCompletedEvent,
  ApplicationHomeVisitScheduledEvent,
  ApplicationRejectedEvent,
  ApplicationSubmittedEvent,
  AuthRoleAssignedEvent,
  AuthUserLoggedInEvent,
  ChatMessageCreatedEvent,
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
  // Cross-service clients for recipient discovery. Optional — when a
  // client is absent (its gRPC URL isn't configured) the corresponding
  // fan-out no-ops gracefully, exactly like Broadcast degrades without
  // authGrpcUrl. The wire path stays subscribed either way.
  petsClient?: PetsFavoritersClient;
  rescueClient?: RescueStaffClient;
};

// Durable-consumer name prefix so multiple replicas of service.notifications
// share work — all replicas bind the SAME durable per subject, so JetStream
// delivers each message to exactly one of them. The string is part of the
// deployment contract; changing it elsewhere means duplicate handling during
// the rollover. One durable per subject (subject dots → dashes) keeps each
// subscriber's redelivery cursor independent.
const DURABLE_PREFIX = 'notifications-workers';

const durableFor = (subject: string): string => `${DURABLE_PREFIX}-${subject.replace(/\./g, '-')}`;

// Build the dedup options for a delivered event. `meta.id` is the
// publisher's envelope id; the subject scopes the claim so lifecycle
// events that reuse an aggregate id (applications.* publish every state
// under the application id) don't collide. When a publisher omits the id
// we cannot dedupe — fall back to always-create rather than silently
// dropping a notification.
const dedupFor = (
  subject: string,
  meta: { id?: string }
): { dedup: { consumer: string; eventId: string } } | undefined =>
  meta.id ? { dedup: { consumer: subject, eventId: meta.id } } : undefined;

// Per-recipient dedup key for fan-out subjects (one event → N rows). The
// recipient is appended to the event id so the first recipient's claim
// doesn't suppress everyone else's notification. Mirrors the chat handler's
// inline `${meta.id}:${userId}` key.
const perRecipientDedup = (
  subject: string,
  meta: { id?: string },
  recipientUserId: string
): { dedup: { consumer: string; eventId: string } } | undefined =>
  meta.id ? { dedup: { consumer: subject, eventId: `${meta.id}:${recipientUserId}` } } : undefined;

export const registerSubscribers = (opts: RegisterSubscribersOptions): SubscriptionHandle[] => {
  const { nats, deps, logger, petsClient, rescueClient } = opts;

  const onError = (err: unknown, ctx: { subject: string }): void => {
    logger.error('subscriber handler failed', {
      subject: ctx.subject,
      err: (err as Error)?.message ?? String(err),
    });
  };

  const subscriptions: SubscriptionHandle[] = [];

  subscriptions.push(
    subscribe<ApplicationSubmittedEvent>(
      nats,
      { subject: 'applications.submitted', durable: durableFor('applications.submitted'), onError },
      async (payload, meta) => {
        await createNotification(
          deps,
          SYSTEM_PRINCIPAL,
          buildApplicationSubmittedCreate(payload),
          dedupFor('applications.submitted', meta)
        );
      }
    )
  );

  subscriptions.push(
    subscribe<ApplicationApprovedEvent>(
      nats,
      { subject: 'applications.approved', durable: durableFor('applications.approved'), onError },
      async (payload, meta) => {
        await createNotification(
          deps,
          SYSTEM_PRINCIPAL,
          buildApplicationApprovedCreate(payload),
          dedupFor('applications.approved', meta)
        );
      }
    )
  );

  subscriptions.push(
    subscribe<ApplicationRejectedEvent>(
      nats,
      { subject: 'applications.rejected', durable: durableFor('applications.rejected'), onError },
      async (payload, meta) => {
        await createNotification(
          deps,
          SYSTEM_PRINCIPAL,
          buildApplicationRejectedCreate(payload),
          dedupFor('applications.rejected', meta)
        );
      }
    )
  );

  subscriptions.push(
    subscribe<ApplicationHomeVisitScheduledEvent>(
      nats,
      {
        subject: 'applications.homeVisitScheduled',
        durable: durableFor('applications.homeVisitScheduled'),
        onError,
      },
      async (payload, meta) => {
        await createNotification(
          deps,
          SYSTEM_PRINCIPAL,
          buildApplicationHomeVisitScheduledCreate(payload),
          dedupFor('applications.homeVisitScheduled', meta)
        );
      }
    )
  );

  subscriptions.push(
    subscribe<ApplicationHomeVisitCompletedEvent>(
      nats,
      {
        subject: 'applications.homeVisitCompleted',
        durable: durableFor('applications.homeVisitCompleted'),
        onError,
      },
      async (payload, meta) => {
        await createNotification(
          deps,
          SYSTEM_PRINCIPAL,
          buildApplicationHomeVisitCompletedCreate(payload),
          dedupFor('applications.homeVisitCompleted', meta)
        );
      }
    )
  );

  subscriptions.push(
    subscribe<ApplicationAdoptedEvent>(
      nats,
      { subject: 'applications.adopted', durable: durableFor('applications.adopted'), onError },
      async (payload, meta) => {
        await createNotification(
          deps,
          SYSTEM_PRINCIPAL,
          buildApplicationAdoptedCreate(payload),
          dedupFor('applications.adopted', meta)
        );
      }
    )
  );

  subscriptions.push(
    subscribe<AuthUserLoggedInEvent>(
      nats,
      { subject: 'auth.userLoggedIn', durable: durableFor('auth.userLoggedIn'), onError },
      async (payload, meta) => {
        await createNotification(
          deps,
          SYSTEM_PRINCIPAL,
          buildAuthUserLoggedInCreate(payload),
          dedupFor('auth.userLoggedIn', meta)
        );
      }
    )
  );

  subscriptions.push(
    subscribe<AuthRoleAssignedEvent>(
      nats,
      { subject: 'auth.roleAssigned', durable: durableFor('auth.roleAssigned'), onError },
      async (payload, meta) => {
        await createNotification(
          deps,
          SYSTEM_PRINCIPAL,
          buildAuthRoleAssignedCreate(payload),
          dedupFor('auth.roleAssigned', meta)
        );
      }
    )
  );

  // pets.statusChanged — fan a pet_update notification out to every user
  // who FAVOURITED the pet. Recipient discovery is PetService.ListFavoriters
  // (a system-principal gRPC read). When the pets client isn't configured
  // the fan-out no-ops gracefully — the wire path stays subscribed either
  // way. pets.deleted stays log-only (no recipient derivable here).
  subscriptions.push(
    subscribe<PetStatusChangedEvent>(
      nats,
      { subject: 'pets.statusChanged', durable: durableFor('pets.statusChanged'), onError },
      async (payload, meta) => {
        if (!petsClient) {
          logger.warn('pets.statusChanged fan-out skipped — no PETS_GRPC_URL configured', {
            petId: payload.petId,
          });
          return;
        }
        const favouriters = await petsClient.listFavoriters(payload.petId);
        // Each favouriter gets one row; one recipient's failure must not
        // abort the rest (poison-pill protection — same as the chat handler).
        for (const userId of favouriters) {
          try {
            await createNotification(
              deps,
              SYSTEM_PRINCIPAL,
              buildPetStatusChangedCreate(payload, userId),
              perRecipientDedup('pets.statusChanged', meta, userId)
            );
          } catch (err) {
            logger.warn('pets.statusChanged notification create failed', {
              petId: payload.petId,
              recipientUserId: userId,
              err: (err as Error)?.message ?? String(err),
            });
          }
        }
      }
    )
  );

  subscriptions.push(
    subscribe<PetDeletedEvent>(
      nats,
      { subject: 'pets.deleted', durable: durableFor('pets.deleted'), onError },
      async payload => {
        logger.info('pets.deleted received', {
          petId: payload.petId,
          rescueId: payload.rescueId,
        });
      }
    )
  );

  // rescue.verified / rescue.rejected — fan a system-announcement
  // notification out to the rescue's staff. Recipient discovery is
  // RescueService.ListStaffMembers (a system-principal gRPC read); the
  // rescue name (for the body) comes from RescueService.Get. When the
  // rescue client isn't configured the fan-out no-ops gracefully.
  // rescue.staffInvited stays log-only — it carries an email for a
  // possibly-not-yet-user, which is out of scope for the staff fan-out.
  subscriptions.push(
    subscribe<RescueVerifiedEvent>(
      nats,
      { subject: 'rescue.verified', durable: durableFor('rescue.verified'), onError },
      async (payload, meta) => {
        if (!rescueClient) {
          logger.warn('rescue.verified fan-out skipped — no RESCUE_GRPC_URL configured', {
            rescueId: payload.rescueId,
          });
          return;
        }
        const staff = await rescueClient.listStaffMembers(payload.rescueId);
        const rescueName = await rescueClient.getRescueName(payload.rescueId);
        for (const userId of staff) {
          try {
            await createNotification(
              deps,
              SYSTEM_PRINCIPAL,
              buildRescueVerifiedCreate(payload, rescueName, userId),
              perRecipientDedup('rescue.verified', meta, userId)
            );
          } catch (err) {
            logger.warn('rescue.verified notification create failed', {
              rescueId: payload.rescueId,
              recipientUserId: userId,
              err: (err as Error)?.message ?? String(err),
            });
          }
        }
      }
    )
  );

  subscriptions.push(
    subscribe<RescueRejectedEvent>(
      nats,
      { subject: 'rescue.rejected', durable: durableFor('rescue.rejected'), onError },
      async (payload, meta) => {
        if (!rescueClient) {
          logger.warn('rescue.rejected fan-out skipped — no RESCUE_GRPC_URL configured', {
            rescueId: payload.rescueId,
          });
          return;
        }
        const staff = await rescueClient.listStaffMembers(payload.rescueId);
        const rescueName = await rescueClient.getRescueName(payload.rescueId);
        for (const userId of staff) {
          try {
            await createNotification(
              deps,
              SYSTEM_PRINCIPAL,
              buildRescueRejectedCreate(payload, rescueName, userId),
              perRecipientDedup('rescue.rejected', meta, userId)
            );
          } catch (err) {
            logger.warn('rescue.rejected notification create failed', {
              rescueId: payload.rescueId,
              recipientUserId: userId,
              err: (err as Error)?.message ?? String(err),
            });
          }
        }
      }
    )
  );

  subscriptions.push(
    subscribe<RescueStaffInvitedEvent>(
      nats,
      { subject: 'rescue.staffInvited', durable: durableFor('rescue.staffInvited'), onError },
      async payload => {
        // The invitee email is PII — keep it out of operational logs
        // (Layer 1 redaction only protects known fields). Identifiers
        // are sufficient to trace the event.
        logger.info('rescue.staffInvited received', {
          invitationId: payload.invitationId,
          rescueId: payload.rescueId,
        });
      }
    )
  );

  // chat.messageCreated — fan a NOTIFICATION_TYPE_MESSAGE_RECEIVED row
  // out to every recipient (participants minus the sender). The
  // realtime ping is already handled by the gateway WS subscriber; this
  // creates the durable Notification row so offline users have a
  // record + an unread badge to come back to.
  subscriptions.push(
    subscribe<ChatMessageCreatedEvent>(
      nats,
      { subject: 'chat.messageCreated', durable: durableFor('chat.messageCreated'), onError },
      async (payload, meta) => {
        const recipients = payload.participantUserIds.filter(id => id !== payload.senderUserId);
        // Each recipient gets one in-app notification. Errors from a
        // single recipient must not abort the others (CAD lesson #4 —
        // poison-pill subscribers); wrap each in its own try/catch.
        for (const userId of recipients) {
          try {
            // One event fans out to N rows, so the dedup key includes the
            // recipient — otherwise the first recipient's claim would
            // suppress everyone else's notification.
            const dedup = meta.id
              ? { dedup: { consumer: 'chat.messageCreated', eventId: `${meta.id}:${userId}` } }
              : undefined;
            await createNotification(
              deps,
              SYSTEM_PRINCIPAL,
              buildChatMessageReceivedCreate(payload, userId),
              dedup
            );
          } catch (err) {
            logger.warn('chat.messageCreated notification create failed', {
              chatId: payload.chatId,
              messageId: payload.messageId,
              recipientUserId: userId,
              err: (err as Error)?.message ?? String(err),
            });
          }
        }
      }
    )
  );

  logger.info('NATS subscribers registered', {
    subjects: subscriptions.length,
    durablePrefix: DURABLE_PREFIX,
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

// applications.homeVisitScheduled — the adopter needs the date, so a
// HIGH-priority in-app ping. The timestamp rides in data_json (not the
// message body) so the SPA formats it in the user's locale.
export const buildApplicationHomeVisitScheduledCreate = (
  event: ApplicationHomeVisitScheduledEvent
): CreateNotificationRequest => ({
  userId: event.adopterId as string,
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_HOME_VISIT_SCHEDULED,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_HIGH,
  title: 'Home visit scheduled',
  message: 'A home visit has been scheduled for your application. Check the details for the date.',
  dataJson: JSON.stringify({
    applicationId: event.applicationId,
    rescueId: event.rescueId,
    scheduledAt: event.scheduledAt,
  }),
  templateVariablesJson: '{}',
  relatedEntityType:
    NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_HOME_VISIT,
  relatedEntityId: event.applicationId,
});

// applications.homeVisitCompleted — tell the adopter the visit is done.
// The pass/fail outcome stays in data_json so the dashboard frames it
// appropriately rather than the raw enum landing in a notification body.
export const buildApplicationHomeVisitCompletedCreate = (
  event: ApplicationHomeVisitCompletedEvent
): CreateNotificationRequest => ({
  userId: event.adopterId as string,
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
  title: 'Home visit completed',
  message: 'Your home visit is complete. The rescue will be in touch with the next steps.',
  dataJson: JSON.stringify({
    applicationId: event.applicationId,
    rescueId: event.rescueId,
    outcome: event.outcome,
  }),
  templateVariablesJson: '{}',
  relatedEntityType:
    NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_HOME_VISIT,
  relatedEntityId: event.applicationId,
});

// applications.adopted — the celebratory final event. HIGH priority so
// the SPA pinger surfaces it prominently.
export const buildApplicationAdoptedCreate = (
  event: ApplicationAdoptedEvent
): CreateNotificationRequest => ({
  userId: event.adopterId as string,
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_HIGH,
  title: 'Adoption complete! 🎉',
  message:
    'Congratulations — your adoption is now complete. Thank you for giving a pet a loving home!',
  dataJson: JSON.stringify({
    applicationId: event.applicationId,
    petId: event.petId,
    rescueId: event.rescueId,
  }),
  templateVariablesJson: '{}',
  relatedEntityType:
    NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_ADOPTION,
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

// Cap the message preview so we never store the full chat body on the
// notification row — the SPA opens the chat to read more, and a runaway
// 10k-char message shouldn't bloat the notifications.notifications row.
const CHAT_PREVIEW_LIMIT = 140;

export const buildChatMessageReceivedCreate = (
  event: ChatMessageCreatedEvent,
  recipientUserId: string
): CreateNotificationRequest => {
  const preview =
    event.body.length > CHAT_PREVIEW_LIMIT
      ? `${event.body.slice(0, CHAT_PREVIEW_LIMIT - 1)}…`
      : event.body;
  return {
    userId: recipientUserId,
    type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_MESSAGE_RECEIVED,
    channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
    priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
    title: 'New message',
    message: preview,
    dataJson: JSON.stringify({
      chatId: event.chatId,
      messageId: event.messageId,
      senderUserId: event.senderUserId,
    }),
    templateVariablesJson: '{}',
    relatedEntityType:
      NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_MESSAGE,
    relatedEntityId: event.messageId,
  };
};

// pets.statusChanged — fan an in-app update out to every user who
// favourited the pet. Type PET_UPDATE (the closest existing fit for a
// favourite-pet status change). The from/to status pair rides in
// data_json so the SPA frames "now available" vs "adopted" appropriately
// rather than the raw enum landing in the body.
export const buildPetStatusChangedCreate = (
  event: PetStatusChangedEvent,
  recipientUserId: string
): CreateNotificationRequest => ({
  userId: recipientUserId,
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_PET_UPDATE,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
  title: 'A pet you favourited was updated',
  message: 'The status of a pet on your favourites list has changed.',
  dataJson: JSON.stringify({
    petId: event.petId,
    rescueId: event.rescueId,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
  }),
  templateVariablesJson: '{}',
  relatedEntityType:
    NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_PET,
  relatedEntityId: event.petId,
});

// rescue.verified — tell the rescue's staff their organisation was
// verified. There is no dedicated "rescue updates" NotificationType, so
// we use NOTIFICATION_TYPE_SYSTEM_ANNOUNCEMENT — the generic system /
// platform-news type — which is the closest existing fit for rescue-org
// status news. HIGH priority: verification unblocks the rescue's ability
// to list pets, so staff should see it promptly.
export const buildRescueVerifiedCreate = (
  event: RescueVerifiedEvent,
  rescueName: string | null,
  recipientUserId: string
): CreateNotificationRequest => ({
  userId: recipientUserId,
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_SYSTEM_ANNOUNCEMENT,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_HIGH,
  title: 'Your rescue has been verified',
  message: rescueName
    ? `${rescueName} has been verified. You can now publish pet listings.`
    : 'Your rescue has been verified. You can now publish pet listings.',
  dataJson: JSON.stringify({
    rescueId: event.rescueId,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
  }),
  templateVariablesJson: '{}',
  relatedEntityType:
    NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_RESCUE,
  relatedEntityId: event.rescueId,
});

// rescue.rejected — same SYSTEM_ANNOUNCEMENT type + RESCUE related-entity
// as rescue.verified, different translation. The reason rides in the
// message body when present so staff understand the decision.
export const buildRescueRejectedCreate = (
  event: RescueRejectedEvent,
  rescueName: string | null,
  recipientUserId: string
): CreateNotificationRequest => ({
  userId: recipientUserId,
  type: NotificationsV1.NotificationType.NOTIFICATION_TYPE_SYSTEM_ANNOUNCEMENT,
  channel: NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP,
  priority: NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL,
  title: 'Your rescue application was not approved',
  message: event.reason
    ? `Your rescue application was not approved. Reason: ${event.reason}`
    : 'Your rescue application was not approved.',
  dataJson: JSON.stringify({
    rescueId: event.rescueId,
    reason: event.reason ?? null,
  }),
  templateVariablesJson: '{}',
  relatedEntityType:
    NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_RESCUE,
  relatedEntityId: event.rescueId,
});
