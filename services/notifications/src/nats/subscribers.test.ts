import type { NatsConnection } from 'nats';
import { describe, expect, it, vi } from 'vitest';

import type { UserId } from '@adopt-dont-shop/lib.types';
import { NotificationsV1 } from '@adopt-dont-shop/proto';

import {
  buildApplicationAdoptedCreate,
  buildApplicationApprovedCreate,
  buildApplicationHomeVisitCompletedCreate,
  buildApplicationHomeVisitScheduledCreate,
  buildApplicationRejectedCreate,
  buildApplicationSubmittedCreate,
  buildAuthRoleAssignedCreate,
  buildAuthUserLoggedInCreate,
  buildChatMessageReceivedCreate,
  registerSubscribers,
} from './subscribers.js';

// --- Translation tests (pure functions) ----------------------------

describe('event → CreateNotificationRequest translation', () => {
  describe('buildApplicationSubmittedCreate', () => {
    it('targets the adopter with an in-app application_status notification at NORMAL priority', () => {
      const req = buildApplicationSubmittedCreate({
        applicationId: 'app-1',
        adopterId: 'usr-a' as UserId,
        petId: 'pet-1',
        rescueId: 'res-1',
        submittedAt: '2026-06-01T10:00:00Z',
      });

      expect(req.userId).toBe('usr-a');
      expect(req.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS);
      expect(req.channel).toBe(NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(req.priority).toBe(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL);
      expect(req.title).toMatch(/received/i);
      expect(req.relatedEntityType).toBe(
        NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_APPLICATION
      );
      expect(req.relatedEntityId).toBe('app-1');

      // data_json contains the IDs the SPA needs to deep-link
      const data = JSON.parse(req.dataJson) as Record<string, string>;
      expect(data).toEqual({
        applicationId: 'app-1',
        petId: 'pet-1',
        rescueId: 'res-1',
      });
    });
  });

  describe('buildApplicationApprovedCreate', () => {
    it('bumps priority to HIGH so the SPA pinger surfaces the approval prominently', () => {
      const req = buildApplicationApprovedCreate({
        applicationId: 'app-1',
        adopterId: 'usr-a' as UserId,
        petId: 'pet-1',
        rescueId: 'res-1',
        approvedAt: '2026-06-02T10:00:00Z',
      });

      expect(req.priority).toBe(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_HIGH);
      expect(req.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_ADOPTION_APPROVED);
      expect(req.title).toMatch(/approved/i);
    });
  });

  describe('buildApplicationRejectedCreate', () => {
    it('uses the rejected type at NORMAL priority and surfaces the reason when present', () => {
      const req = buildApplicationRejectedCreate({
        applicationId: 'app-1',
        adopterId: 'usr-a' as UserId,
        petId: 'pet-1',
        rescueId: 'res-1',
        rejectedAt: '2026-06-03T10:00:00Z',
        reason: 'previous owner returned the pet',
      });

      expect(req.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_ADOPTION_REJECTED);
      expect(req.priority).toBe(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL);
      expect(req.message).toContain('previous owner returned the pet');
      const data = JSON.parse(req.dataJson) as Record<string, unknown>;
      expect(data.reason).toBe('previous owner returned the pet');
    });

    it('falls back to a generic body when no reason is supplied', () => {
      const req = buildApplicationRejectedCreate({
        applicationId: 'app-1',
        adopterId: 'usr-a' as UserId,
        petId: 'pet-1',
        rescueId: 'res-1',
        rejectedAt: '2026-06-03T10:00:00Z',
      });

      expect(req.message).not.toContain('Reason:');
      const data = JSON.parse(req.dataJson) as Record<string, unknown>;
      expect(data.reason).toBeNull();
    });
  });

  describe('buildApplicationHomeVisitScheduledCreate', () => {
    it('targets the adopter with a HIGH-priority home-visit notification and carries the date', () => {
      const req = buildApplicationHomeVisitScheduledCreate({
        applicationId: 'app-1',
        adopterId: 'usr-a' as UserId,
        rescueId: 'res-1',
        scheduledAt: '2026-06-10T14:00:00Z',
      });

      expect(req.userId).toBe('usr-a');
      expect(req.type).toBe(
        NotificationsV1.NotificationType.NOTIFICATION_TYPE_HOME_VISIT_SCHEDULED
      );
      expect(req.priority).toBe(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_HIGH);
      expect(req.relatedEntityType).toBe(
        NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_HOME_VISIT
      );
      const data = JSON.parse(req.dataJson) as Record<string, string>;
      expect(data.scheduledAt).toBe('2026-06-10T14:00:00Z');
    });
  });

  describe('buildApplicationHomeVisitCompletedCreate', () => {
    it('keeps the pass/fail outcome out of the message body but in data_json', () => {
      const req = buildApplicationHomeVisitCompletedCreate({
        applicationId: 'app-1',
        adopterId: 'usr-a' as UserId,
        rescueId: 'res-1',
        outcome: 'failed',
      });

      expect(req.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_APPLICATION_STATUS);
      expect(req.message).not.toContain('failed');
      const data = JSON.parse(req.dataJson) as Record<string, string>;
      expect(data.outcome).toBe('failed');
    });
  });

  describe('buildApplicationAdoptedCreate', () => {
    it('produces a HIGH-priority celebratory notification related to the adoption', () => {
      const req = buildApplicationAdoptedCreate({
        applicationId: 'app-1',
        adopterId: 'usr-a' as UserId,
        petId: 'pet-1',
        rescueId: 'res-1',
      });

      expect(req.priority).toBe(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_HIGH);
      expect(req.title).toMatch(/complete/i);
      expect(req.relatedEntityType).toBe(
        NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_ADOPTION
      );
      const data = JSON.parse(req.dataJson) as Record<string, string>;
      expect(data).toEqual({ applicationId: 'app-1', petId: 'pet-1', rescueId: 'res-1' });
    });
  });

  describe('buildAuthUserLoggedInCreate', () => {
    it('produces a LOW-priority ACCOUNT_SECURITY in-app notification with the IP + UA', () => {
      const req = buildAuthUserLoggedInCreate({
        userId: 'usr-a' as UserId,
        ipAddress: '203.0.113.7',
        userAgent: 'Chrome on macOS',
      });
      expect(req.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_ACCOUNT_SECURITY);
      expect(req.priority).toBe(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_LOW);
      expect(req.channel).toBe(NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(req.message).toContain('203.0.113.7');
      expect(req.message).toContain('Chrome on macOS');
      expect(req.relatedEntityType).toBe(
        NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_SECURITY
      );
    });

    it('falls back gracefully when ipAddress / userAgent are null', () => {
      const req = buildAuthUserLoggedInCreate({
        userId: 'usr-a' as UserId,
        ipAddress: null,
        userAgent: null,
      });
      expect(req.message).toContain('unknown location');
      expect(req.message).not.toContain('null');
    });
  });

  describe('buildAuthRoleAssignedCreate', () => {
    it('announces the new role with NORMAL priority and the canonical role string', () => {
      const req = buildAuthRoleAssignedCreate({
        targetUserId: 'usr-a' as UserId,
        role: 'rescue_staff',
        assignedBy: 'usr-admin' as UserId,
        reason: null,
      });
      expect(req.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_STAFF_ASSIGNMENT);
      expect(req.priority).toBe(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL);
      expect(req.message).toContain('rescue_staff');
      const data = JSON.parse(req.dataJson) as Record<string, unknown>;
      expect(data.role).toBe('rescue_staff');
      expect(data.assignedBy).toBe('usr-admin');
    });

    it('appends the reason when supplied', () => {
      const req = buildAuthRoleAssignedCreate({
        targetUserId: 'usr-a' as UserId,
        role: 'moderator',
        assignedBy: 'usr-admin' as UserId,
        reason: 'community trust',
      });
      expect(req.message).toContain('Reason: community trust');
    });
  });

  describe('buildChatMessageReceivedCreate', () => {
    const baseEvent = {
      messageId: 'msg-1',
      chatId: 'chat-1',
      senderUserId: 'usr-sender',
      body: 'Hello!',
      participantUserIds: ['usr-sender', 'usr-recipient'],
    };

    it('targets the recipient with an in-app MESSAGE_RECEIVED row at NORMAL priority', () => {
      const req = buildChatMessageReceivedCreate(baseEvent, 'usr-recipient');
      expect(req.userId).toBe('usr-recipient');
      expect(req.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_MESSAGE_RECEIVED);
      expect(req.channel).toBe(NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(req.priority).toBe(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL);
      expect(req.title).toBe('New message');
      expect(req.message).toBe('Hello!');
      expect(req.relatedEntityType).toBe(
        NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_MESSAGE
      );
      expect(req.relatedEntityId).toBe('msg-1');
      const data = JSON.parse(req.dataJson) as Record<string, unknown>;
      expect(data.chatId).toBe('chat-1');
      expect(data.messageId).toBe('msg-1');
      expect(data.senderUserId).toBe('usr-sender');
    });

    it('truncates bodies that exceed the preview cap with an ellipsis', () => {
      const longBody = 'a'.repeat(500);
      const req = buildChatMessageReceivedCreate({ ...baseEvent, body: longBody }, 'usr-recipient');
      // 139 chars of body + the ellipsis terminator = 140 total preview.
      expect(req.message.length).toBe(140);
      expect(req.message.endsWith('…')).toBe(true);
    });
  });
});

// --- Subscriber registration ----------------------------------------

describe('registerSubscribers', () => {
  // Real subscribe() from @adopt-dont-shop/events now binds a durable
  // JetStream consumer: it calls jetstreamManager().consumers.add(...) to
  // create the durable, then jetstream().consumers.get(...).consume() to
  // drive the loop. We stub a JetStream connection whose consume() yields
  // nothing so the loop completes immediately, and capture the durable
  // configs each subscriber requests.
  type AddedConsumer = { durable_name?: string; filter_subject?: string };

  function makeNats(): {
    nats: NatsConnection;
    consumersAdded: AddedConsumer[];
  } {
    const consumersAdded: AddedConsumer[] = [];
    const jsm = {
      consumers: {
        add: vi.fn(async (_stream: string, cfg: AddedConsumer) => {
          consumersAdded.push(cfg);
          return cfg;
        }),
      },
    };
    const js = {
      consumers: {
        get: vi.fn(async () => ({
          consume: vi.fn(async () => ({
            async *[Symbol.asyncIterator]() {
              // no messages
            },
            close: vi.fn(),
          })),
        })),
      },
    };
    const nats = {
      jetstreamManager: vi.fn(async () => jsm),
      jetstream: vi.fn(() => js),
    } as unknown as NatsConnection;
    return { nats, consumersAdded };
  }

  const deps = {
    pool: {},
    nats: {} as NatsConnection,
  } as unknown as Parameters<typeof registerSubscribers>[0]['deps'];

  const logger = {
    info: () => undefined,
    error: () => undefined,
    warn: () => undefined,
    debug: () => undefined,
    silly: () => undefined,
  } as unknown as Parameters<typeof registerSubscribers>[0]['logger'];

  const flush = async (): Promise<void> => {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setImmediate(r));
    }
  };

  it('registers a durable consumer per known cross-service subject', async () => {
    const { nats, consumersAdded } = makeNats();

    const subs = registerSubscribers({ nats, deps, logger });
    await flush();

    expect(subs).toHaveLength(14);
    const subjects = consumersAdded.map(c => c.filter_subject);
    expect(subjects).toEqual([
      'applications.submitted',
      'applications.approved',
      'applications.rejected',
      'applications.homeVisitScheduled',
      'applications.homeVisitCompleted',
      'applications.adopted',
      'auth.userLoggedIn',
      'auth.roleAssigned',
      'pets.statusChanged',
      'pets.deleted',
      'rescue.verified',
      'rescue.rejected',
      'rescue.staffInvited',
      'chat.messageCreated',
    ]);
  });

  it('names each durable consumer with the shared notifications-workers prefix', async () => {
    const { nats, consumersAdded } = makeNats();

    registerSubscribers({ nats, deps, logger });
    await flush();

    for (const cfg of consumersAdded) {
      expect(cfg.durable_name).toMatch(/^notifications-workers-/);
    }
  });
});
