import type { NatsConnection } from 'nats';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserId } from '@adopt-dont-shop/lib.types';
import { NotificationsV1 } from '@adopt-dont-shop/proto';

import { createNotification } from '../grpc/handlers.js';

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
  buildPetStatusChangedCreate,
  buildRescueRejectedCreate,
  buildRescueVerifiedCreate,
  registerSubscribers,
} from './subscribers.js';

// createNotification is mocked so the wiring tests can assert exactly what
// dedup options each subscriber threads through, without standing up a DB.
// The translation + registration tests below never deliver a message, so
// the real handler is never needed there.
vi.mock('../grpc/handlers.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../grpc/handlers.js')>();
  return { ...actual, createNotification: vi.fn(async () => ({ notification: undefined })) };
});

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

  describe('buildPetStatusChangedCreate', () => {
    it('targets the favouriter with an in-app PET_UPDATE row at NORMAL priority', () => {
      const req = buildPetStatusChangedCreate(
        {
          petId: 'pet-1',
          rescueId: 'res-1',
          fromStatus: 'available',
          toStatus: 'adopted',
          reason: null,
        },
        'usr-fav'
      );

      expect(req.userId).toBe('usr-fav');
      expect(req.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_PET_UPDATE);
      expect(req.channel).toBe(NotificationsV1.NotificationChannel.NOTIFICATION_CHANNEL_IN_APP);
      expect(req.priority).toBe(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL);
      expect(req.relatedEntityType).toBe(
        NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_PET
      );
      expect(req.relatedEntityId).toBe('pet-1');

      // The raw status enum stays out of the body, but rides in data_json.
      expect(req.message).not.toContain('adopted');
      const data = JSON.parse(req.dataJson) as Record<string, unknown>;
      expect(data).toEqual({
        petId: 'pet-1',
        rescueId: 'res-1',
        fromStatus: 'available',
        toStatus: 'adopted',
      });
    });
  });

  describe('buildRescueVerifiedCreate', () => {
    it('produces a HIGH-priority SYSTEM_ANNOUNCEMENT to the staff member with the rescue name', () => {
      const req = buildRescueVerifiedCreate(
        { rescueId: 'res-1', fromStatus: 'pending', toStatus: 'verified', reason: null },
        'Happy Tails',
        'usr-staff'
      );

      expect(req.userId).toBe('usr-staff');
      expect(req.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_SYSTEM_ANNOUNCEMENT);
      expect(req.priority).toBe(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_HIGH);
      expect(req.message).toContain('Happy Tails');
      expect(req.relatedEntityType).toBe(
        NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_RESCUE
      );
      expect(req.relatedEntityId).toBe('res-1');
    });

    it('falls back to a generic body when the rescue name is unavailable', () => {
      const req = buildRescueVerifiedCreate(
        { rescueId: 'res-1', fromStatus: 'pending', toStatus: 'verified', reason: null },
        null,
        'usr-staff'
      );
      expect(req.message).not.toContain('null');
      expect(req.message).toMatch(/verified/i);
    });
  });

  describe('buildRescueRejectedCreate', () => {
    it('surfaces the rejection reason when present', () => {
      const req = buildRescueRejectedCreate(
        {
          rescueId: 'res-1',
          fromStatus: 'pending',
          toStatus: 'rejected',
          reason: 'incomplete charity registration',
        },
        'Happy Tails',
        'usr-staff'
      );

      expect(req.type).toBe(NotificationsV1.NotificationType.NOTIFICATION_TYPE_SYSTEM_ANNOUNCEMENT);
      expect(req.priority).toBe(NotificationsV1.NotificationPriority.NOTIFICATION_PRIORITY_NORMAL);
      expect(req.message).toContain('incomplete charity registration');
      expect(req.relatedEntityType).toBe(
        NotificationsV1.NotificationRelatedEntityType.NOTIFICATION_RELATED_ENTITY_TYPE_RESCUE
      );
      const data = JSON.parse(req.dataJson) as Record<string, unknown>;
      expect(data.reason).toBe('incomplete charity registration');
    });

    it('falls back to a generic body when no reason is supplied', () => {
      const req = buildRescueRejectedCreate(
        { rescueId: 'res-1', fromStatus: 'pending', toStatus: 'rejected', reason: null },
        'Happy Tails',
        'usr-staff'
      );
      expect(req.message).not.toContain('Reason:');
      const data = JSON.parse(req.dataJson) as Record<string, unknown>;
      expect(data.reason).toBeNull();
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

describe('registerSubscribers idempotency wiring', () => {
  const mockedCreate = vi.mocked(createNotification);

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

  type DeliveredMessage = { id?: string; payload: unknown };

  // A NATS stub whose durable consumers replay the supplied messages for
  // their subject, so a single event can be driven through the real
  // subscribe() loop and we can observe what reaches createNotification.
  function makeYieldingNats(messagesBySubject: Record<string, DeliveredMessage[]>): NatsConnection {
    const durableToSubject = new Map<string, string>();
    const encoder = new TextEncoder();
    const jsm = {
      consumers: {
        add: vi.fn(
          async (_stream: string, cfg: { durable_name?: string; filter_subject?: string }) => {
            if (cfg.durable_name && cfg.filter_subject) {
              durableToSubject.set(cfg.durable_name, cfg.filter_subject);
            }
            return cfg;
          }
        ),
      },
    };
    const js = {
      consumers: {
        get: vi.fn(async (_stream: string, durable: string) => ({
          consume: vi.fn(async () => {
            const subject = durableToSubject.get(durable) ?? '';
            const msgs = (messagesBySubject[subject] ?? []).map(m => ({
              subject,
              data: encoder.encode(
                JSON.stringify({ id: m.id, occurredAt: '2026-06-01T10:00:00Z', payload: m.payload })
              ),
              ack: vi.fn(),
              nak: vi.fn(),
              term: vi.fn(),
            }));
            return {
              async *[Symbol.asyncIterator]() {
                for (const m of msgs) {
                  yield m;
                }
              },
              close: vi.fn(),
            };
          }),
        })),
      },
    };
    return {
      jetstreamManager: vi.fn(async () => jsm),
      jetstream: vi.fn(() => js),
    } as unknown as NatsConnection;
  }

  beforeEach(() => {
    mockedCreate.mockClear();
  });

  it('threads the subject + envelope id into the dedup claim for a single-recipient event', async () => {
    const nats = makeYieldingNats({
      'applications.approved': [
        {
          id: 'app-1',
          payload: {
            applicationId: 'app-1',
            adopterId: 'usr-a',
            petId: 'pet-1',
            rescueId: 'res-1',
            approvedAt: '2026-06-02T10:00:00Z',
          },
        },
      ],
    });

    registerSubscribers({ nats, deps, logger });
    await flush();

    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(mockedCreate.mock.calls[0][3]).toEqual({
      dedup: { consumer: 'applications.approved', eventId: 'app-1' },
    });
  });

  it('keys the chat fan-out dedup per recipient so siblings are not suppressed', async () => {
    const nats = makeYieldingNats({
      'chat.messageCreated': [
        {
          id: 'msg-1',
          payload: {
            messageId: 'msg-1',
            chatId: 'chat-1',
            senderUserId: 'usr-sender',
            body: 'hi',
            participantUserIds: ['usr-sender', 'usr-r1', 'usr-r2'],
          },
        },
      ],
    });

    registerSubscribers({ nats, deps, logger });
    await flush();

    expect(mockedCreate.mock.calls.map(c => c[3]?.dedup)).toEqual([
      { consumer: 'chat.messageCreated', eventId: 'msg-1:usr-r1' },
      { consumer: 'chat.messageCreated', eventId: 'msg-1:usr-r2' },
    ]);
  });

  it('falls back to no dedup when the publisher omits the envelope id', async () => {
    const nats = makeYieldingNats({
      'applications.submitted': [
        {
          payload: {
            applicationId: 'app-2',
            adopterId: 'usr-a',
            petId: 'pet-1',
            rescueId: 'res-1',
            submittedAt: '2026-06-01T10:00:00Z',
          },
        },
      ],
    });

    registerSubscribers({ nats, deps, logger });
    await flush();

    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(mockedCreate.mock.calls[0][3]).toBeUndefined();
  });

  it('fans pets.statusChanged out to every favouriter with a per-recipient dedup key', async () => {
    const nats = makeYieldingNats({
      'pets.statusChanged': [
        {
          id: 'evt-1',
          payload: {
            petId: 'pet-1',
            rescueId: 'res-1',
            fromStatus: 'available',
            toStatus: 'adopted',
            reason: null,
          },
        },
      ],
    });
    const petsClient = {
      listFavoriters: vi.fn(async () => ['usr-f1', 'usr-f2']),
      close: vi.fn(),
    };

    registerSubscribers({ nats, deps, logger, petsClient });
    await flush();

    expect(petsClient.listFavoriters).toHaveBeenCalledWith('pet-1');
    expect(mockedCreate.mock.calls.map(c => [c[2].userId, c[3]?.dedup])).toEqual([
      ['usr-f1', { consumer: 'pets.statusChanged', eventId: 'evt-1:usr-f1' }],
      ['usr-f2', { consumer: 'pets.statusChanged', eventId: 'evt-1:usr-f2' }],
    ]);
  });

  it('no-ops the pets.statusChanged fan-out when no pets client is configured', async () => {
    const nats = makeYieldingNats({
      'pets.statusChanged': [
        {
          id: 'evt-1',
          payload: {
            petId: 'pet-1',
            rescueId: 'res-1',
            fromStatus: 'available',
            toStatus: 'adopted',
            reason: null,
          },
        },
      ],
    });

    registerSubscribers({ nats, deps, logger });
    await flush();

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('fans rescue.verified out to every staff member with a per-recipient dedup key', async () => {
    const nats = makeYieldingNats({
      'rescue.verified': [
        {
          id: 'evt-r',
          payload: {
            rescueId: 'res-1',
            fromStatus: 'pending',
            toStatus: 'verified',
            reason: null,
          },
        },
      ],
    });
    const rescueClient = {
      listStaffMembers: vi.fn(async () => ['usr-s1', 'usr-s2']),
      getRescueName: vi.fn(async () => 'Happy Tails'),
      close: vi.fn(),
    };

    registerSubscribers({ nats, deps, logger, rescueClient });
    await flush();

    expect(rescueClient.listStaffMembers).toHaveBeenCalledWith('res-1');
    expect(mockedCreate.mock.calls.map(c => [c[2].userId, c[3]?.dedup])).toEqual([
      ['usr-s1', { consumer: 'rescue.verified', eventId: 'evt-r:usr-s1' }],
      ['usr-s2', { consumer: 'rescue.verified', eventId: 'evt-r:usr-s2' }],
    ]);
  });
});
