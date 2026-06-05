import type { NatsConnection, Subscription } from 'nats';
import { describe, expect, it, vi } from 'vitest';

import type { UserId } from '@adopt-dont-shop/lib.types';
import { NotificationsV1 } from '@adopt-dont-shop/proto';

import {
  buildApplicationApprovedCreate,
  buildApplicationRejectedCreate,
  buildApplicationSubmittedCreate,
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
});

// --- Subscriber registration ----------------------------------------

describe('registerSubscribers', () => {
  // Real subscribe() from @adopt-dont-shop/events kicks off a for-await
  // loop on the returned Subscription. We need a stub that's async-
  // iterable + immediately done so the loop completes without yielding
  // any messages.
  function fakeSubscription(): Subscription {
    return {
      [Symbol.asyncIterator]() {
        return {
          next: async () => ({ value: undefined, done: true }) as const,
        };
      },
    } as unknown as Subscription;
  }

  function makeNats(): { nats: NatsConnection; subscribeFn: ReturnType<typeof vi.fn> } {
    const subscribeFn = vi.fn().mockReturnValue(fakeSubscription());
    const nats = { subscribe: subscribeFn } as unknown as NatsConnection;
    return { nats, subscribeFn };
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

  it('registers a NATS subscription per known application.* subject', () => {
    const { nats, subscribeFn } = makeNats();

    const subs = registerSubscribers({ nats, deps, logger });

    expect(subs).toHaveLength(3);
    // Subscribed subjects (raw nats.subscribe receives the subject as
    // first arg, then an options object containing `queue`).
    const subjects = subscribeFn.mock.calls.map(call => call[0]);
    expect(subjects).toEqual([
      'applications.submitted',
      'applications.approved',
      'applications.rejected',
    ]);
  });

  it('joins each subscription to the shared notifications-workers queue group', () => {
    const { nats, subscribeFn } = makeNats();

    registerSubscribers({ nats, deps, logger });

    for (const call of subscribeFn.mock.calls) {
      // Second arg is the opts object @adopt-dont-shop/events.subscribe
      // hands the underlying nats client: { queue: 'notifications-workers' }
      expect(call[1]).toEqual({ queue: 'notifications-workers' });
    }
  });
});
