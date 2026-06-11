// Consumer registry for DOMAIN_SUBJECTS.
//
// Every subject prefix in DOMAIN_SUBJECTS must be declared here with the
// services that subscribe to it. Subjects with no consumer today carry an
// explicit `consumers: []` plus a `reason` string so they become documented
// known-orphans rather than silent ones.
//
// Evidence for each consumer is the file that registers the durable
// JetStream subscriber. The test in consumer-registry.test.ts asserts that:
//   1. Every DOMAIN_SUBJECTS entry appears in this registry.
//   2. Every zero-consumer entry carries a non-empty reason string.
// Adding a new subject to stream.ts without an entry here is a CI failure.
//
// Subject resolution notes:
//   - `auth.>` is covered by:
//       * service.notifications subscribes to auth.userLoggedIn,
//         auth.roleAssigned (services/notifications/src/nats/subscribers.ts)
//       * service.audit subscribes to *.actionTaken which captures
//         auth.actionTaken (services/audit/src/nats/subscribers.ts)
//       * service.auth, and all other services, subscribe to
//         gdpr.erasureRequested via registerGdprSubscriber; gdpr.> is its
//         own prefix — the auth prefix here is for auth-domain events.
//   - `gdpr.>` is covered by service.audit (gdpr.erasureRequested +
//       gdpr.erasureCompleted) and by ALL domain services that call
//       registerGdprSubscriber (erasureRequested only).
//   - `*.actionTaken` in audit covers the .actionTaken sub-subject for
//       EVERY domain prefix; it is noted under each domain prefix.
//   - matching.>, moderation.>, cms.>, audit.> have no non-actionTaken
//       subscribers today — the audit wildcard is their only consumer.

import type { DomainSubject } from './stream.js';

export type ConsumerEntry = {
  /** Short service name matching the Docker compose service key, e.g. 'service.audit'. */
  service: string;
  /** Absolute path to the file that registers the durable JetStream subscriber. */
  file: string;
  /** Short description of what the subscription does. */
  description: string;
};

export type ZeroConsumerEntry = {
  consumers: [];
  /** Non-empty explanation of why no service consumes this prefix today. */
  reason: string;
};

export type RegistryEntry = {
  /** The DOMAIN_SUBJECTS entry this record describes (e.g. 'auth.>'). */
  subject: DomainSubject;
} & ({ consumers: ConsumerEntry[] } | ZeroConsumerEntry);

// One record per DOMAIN_SUBJECTS entry, in the same order.
export const CONSUMER_REGISTRY: RegistryEntry[] = [
  {
    subject: 'auth.>',
    consumers: [
      {
        service: 'service.notifications',
        file: 'services/notifications/src/nats/subscribers.ts',
        description:
          'Subscribes to auth.userLoggedIn (security notification) and auth.roleAssigned (role change notification).',
      },
      {
        service: 'service.audit',
        file: 'services/audit/src/nats/subscribers.ts',
        description:
          'Wildcard *.actionTaken consumer captures auth.actionTaken and persists it to audit_events.',
      },
    ],
  },
  {
    subject: 'pets.>',
    consumers: [
      {
        service: 'service.notifications',
        file: 'services/notifications/src/nats/subscribers.ts',
        description:
          'Subscribes to pets.statusChanged (stub — logs only) and pets.deleted (stub — logs only).',
      },
      {
        service: 'service.moderation',
        file: 'services/moderation/src/nats/subscribers.ts',
        description:
          'Subscribes to pets.created for automatic content scanning; files a report if the listing description trips the scanner.',
      },
      {
        service: 'service.audit',
        file: 'services/audit/src/nats/subscribers.ts',
        description: 'Wildcard *.actionTaken captures pets.actionTaken.',
      },
    ],
  },
  {
    subject: 'rescue.>',
    consumers: [
      {
        service: 'service.notifications',
        file: 'services/notifications/src/nats/subscribers.ts',
        description:
          'Subscribes to rescue.verified, rescue.rejected, and rescue.staffInvited (all stub — log only pending recipient-discovery work).',
      },
      {
        service: 'service.audit',
        file: 'services/audit/src/nats/subscribers.ts',
        description: 'Wildcard *.actionTaken captures rescue.actionTaken.',
      },
    ],
  },
  {
    subject: 'applications.>',
    consumers: [
      {
        service: 'service.notifications',
        file: 'services/notifications/src/nats/subscribers.ts',
        description:
          'Subscribes to applications.submitted, applications.approved, applications.rejected, applications.homeVisitScheduled, applications.homeVisitCompleted, applications.adopted — creates user-facing notification rows.',
      },
      {
        service: 'service.moderation',
        file: 'services/moderation/src/nats/subscribers.ts',
        description:
          'Subscribes to applications.submitted for automatic content scanning of adopter-supplied free text.',
      },
      {
        service: 'service.audit',
        file: 'services/audit/src/nats/subscribers.ts',
        description: 'Wildcard *.actionTaken captures applications.actionTaken.',
      },
    ],
  },
  {
    subject: 'chat.>',
    consumers: [
      {
        service: 'service.notifications',
        file: 'services/notifications/src/nats/subscribers.ts',
        description:
          'Subscribes to chat.messageCreated; creates durable in-app notification rows for offline participants.',
      },
      {
        service: 'service.moderation',
        file: 'services/moderation/src/nats/subscribers.ts',
        description:
          'Subscribes to chat.messageCreated for automatic content scanning; files a report if the message body trips the scanner.',
      },
      {
        service: 'service.gateway (WS fan-out)',
        file: 'services/gateway/src/ws/chat-subscriber.ts',
        description:
          'Subscribes to chat.messageCreated, chat.messageRead, chat.reactionAdded, chat.reactionRemoved; delivers real-time Socket.IO events to connected clients.',
      },
      {
        service: 'service.audit',
        file: 'services/audit/src/nats/subscribers.ts',
        description: 'Wildcard *.actionTaken captures chat.actionTaken.',
      },
    ],
  },
  {
    subject: 'notifications.>',
    consumers: [
      {
        service: 'service.gateway (WS fan-out)',
        file: 'services/gateway/src/ws/notifications-subscriber.ts',
        description:
          'Subscribes to notifications.created and notifications.dismissed; delivers real-time Socket.IO events to connected clients.',
      },
      {
        service: 'service.notifications (push worker)',
        file: 'services/notifications/src/push/worker.ts',
        description:
          'Subscribes to notifications.created; delivers push (FCM/APNs) notifications to registered device tokens when channel=push.',
      },
      {
        service: 'service.audit',
        file: 'services/audit/src/nats/subscribers.ts',
        description: 'Wildcard *.actionTaken captures notifications.actionTaken.',
      },
    ],
  },
  {
    subject: 'moderation.>',
    consumers: [
      {
        service: 'service.audit',
        file: 'services/audit/src/nats/subscribers.ts',
        description:
          'Wildcard *.actionTaken is the only consumer; captures moderation.actionTaken events (reportFiled, reportAssigned, reportResolved, sanctionIssued, sanctionAppealed, actionLogged, evidenceAdded, ticketOpened, ticketResponded).',
      },
    ],
  },
  {
    subject: 'matching.>',
    consumers: [
      {
        service: 'service.audit',
        file: 'services/audit/src/nats/subscribers.ts',
        description:
          'Wildcard *.actionTaken is the only consumer; captures matching.actionTaken events (sessionStarted, sessionEnded, swipeRecorded).',
      },
    ],
  },
  {
    subject: 'cms.>',
    consumers: [
      {
        service: 'service.audit',
        file: 'services/audit/src/nats/subscribers.ts',
        description:
          'Wildcard *.actionTaken is the only consumer; captures cms.actionTaken events (contentCreated, contentUpdated, contentDeleted, contentRestored, menuCreated, menuUpdated, menuDeleted).',
      },
    ],
  },
  {
    subject: 'audit.>',
    consumers: [
      {
        service: 'service.audit',
        file: 'services/audit/src/nats/subscribers.ts',
        description:
          'Wildcard *.actionTaken is the only consumer; captures audit.actionTaken events emitted by the audit service itself.',
      },
    ],
  },
  {
    subject: 'gdpr.>',
    consumers: [
      {
        service: 'service.auth',
        file: 'services/auth/src/index.ts',
        description:
          'registerGdprSubscriber — erases auth-schema user data on gdpr.erasureRequested; publishes gdpr.erasureCompleted.',
      },
      {
        service: 'service.notifications',
        file: 'services/notifications/src/index.ts',
        description:
          'registerGdprSubscriber — erases notifications + prefs for the user on gdpr.erasureRequested.',
      },
      {
        service: 'service.pets',
        file: 'services/pets/src/index.ts',
        description:
          'registerGdprSubscriber — erases pets-schema user data on gdpr.erasureRequested.',
      },
      {
        service: 'service.rescue',
        file: 'services/rescue/src/index.ts',
        description:
          'registerGdprSubscriber — erases rescue-schema user data on gdpr.erasureRequested.',
      },
      {
        service: 'service.applications',
        file: 'services/applications/src/index.ts',
        description:
          'registerGdprSubscriber — erases applications-schema user data on gdpr.erasureRequested.',
      },
      {
        service: 'service.chat',
        file: 'services/chat/src/index.ts',
        description:
          'registerGdprSubscriber — erases chat-schema user data on gdpr.erasureRequested.',
      },
      {
        service: 'service.moderation',
        file: 'services/moderation/src/index.ts',
        description:
          'registerGdprSubscriber — erases moderation-schema user data on gdpr.erasureRequested.',
      },
      {
        service: 'service.matching',
        file: 'services/matching/src/index.ts',
        description:
          'registerGdprSubscriber — erases matching-schema user data on gdpr.erasureRequested.',
      },
      {
        service: 'service.cms',
        file: 'services/cms/src/index.ts',
        description:
          'registerGdprSubscriber — erases cms-schema user data on gdpr.erasureRequested.',
      },
      {
        service: 'service.audit (saga tracker)',
        file: 'services/audit/src/nats/gdpr-subscribers.ts',
        description:
          'Subscribes to both gdpr.erasureRequested (records saga request row) and gdpr.erasureCompleted (merges per-service completion into the saga tracker row).',
      },
    ],
  },
];
