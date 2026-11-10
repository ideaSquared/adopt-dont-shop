// Consumer-driven contract: notifications → applications.* (NATS events)
//
// service.notifications turns each application lifecycle event into an
// in-app notification for the adopter (src/nats/subscribers.ts). Each
// interaction pins only the fields the matching build*Create translator
// reads, and feeds the message through that translator, so the contract
// fails if a field the notification needs goes missing.
//
// event-types.ts also declares fields no translator reads (submittedAt,
// approvedAt, rejectedAt); they are deliberately not pinned here.
//
// Provider verification:
// services/applications/test/contracts/applications-events.provider.test.ts.
// See ADR 0005.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MatchersV3, MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

import type {
  ApplicationAdoptedEvent,
  ApplicationApprovedEvent,
  ApplicationHomeVisitCompletedEvent,
  ApplicationHomeVisitScheduledEvent,
  ApplicationRejectedEvent,
  ApplicationSubmittedEvent,
} from '../../src/nats/event-types.js';
import {
  buildApplicationAdoptedCreate,
  buildApplicationApprovedCreate,
  buildApplicationHomeVisitCompletedCreate,
  buildApplicationHomeVisitScheduledCreate,
  buildApplicationRejectedCreate,
  buildApplicationSubmittedCreate,
} from '../../src/nats/subscribers.js';
import { eventBody } from './event-body.js';

const { like, regex } = MatchersV3;

// Repo-root pacts/ directory: test/contracts/ → test/ → notifications/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const ISO_8601 = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$';

const pact = new MessageConsumerPact({
  consumer: 'service.notifications',
  provider: 'service.applications',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

// The ids every application notification carries.
const APPLICATION_IDS = {
  applicationId: like('app-001'),
  adopterId: like('usr-adopter'),
  petId: like('pet-001'),
  rescueId: like('rescue-001'),
};
const ID_FIELDS = ['applicationId', 'adopterId', 'petId', 'rescueId'] as const;

const dataOf = (dataJson: string): unknown => JSON.parse(dataJson);

describe('notifications consumer → applications: applications.*', () => {
  it('notifies the adopter that applications.submitted was received', () => {
    return pact
      .given('an adopter submits a draft application')
      .expectsToReceive('applications.submitted event')
      .withContent(APPLICATION_IDS)
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<ApplicationSubmittedEvent>(
            'applications.submitted',
            body,
            ID_FIELDS
          );
          const create = buildApplicationSubmittedCreate(event);
          expect(create.userId).toBe('usr-adopter');
          expect(create.relatedEntityId).toBe('app-001');
          expect(dataOf(create.dataJson)).toEqual({
            applicationId: 'app-001',
            petId: 'pet-001',
            rescueId: 'rescue-001',
          });
        })
      );
  });

  it('notifies the adopter of applications.approved', () => {
    return pact
      .given('rescue staff approve an application')
      .expectsToReceive('applications.approved event')
      .withContent(APPLICATION_IDS)
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<ApplicationApprovedEvent>(
            'applications.approved',
            body,
            ID_FIELDS
          );
          const create = buildApplicationApprovedCreate(event);
          expect(create.userId).toBe('usr-adopter');
          expect(create.relatedEntityId).toBe('app-001');
          expect(dataOf(create.dataJson)).toEqual({
            applicationId: 'app-001',
            petId: 'pet-001',
            rescueId: 'rescue-001',
          });
        })
      );
  });

  it('notifies the adopter of applications.rejected with the reason', () => {
    return pact
      .given('rescue staff reject an application with a reason')
      .expectsToReceive('applications.rejected event with a reason')
      .withContent({ ...APPLICATION_IDS, reason: like('Home unsuitable for a large dog') })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<ApplicationRejectedEvent>('applications.rejected', body, [
            ...ID_FIELDS,
            'reason',
          ]);
          const create = buildApplicationRejectedCreate(event);
          expect(create.userId).toBe('usr-adopter');
          expect(create.message).toContain('Home unsuitable for a large dog');
          expect(dataOf(create.dataJson)).toEqual({
            applicationId: 'app-001',
            petId: 'pet-001',
            rescueId: 'rescue-001',
            reason: 'Home unsuitable for a large dog',
          });
        })
      );
  });

  it('notifies the adopter of applications.homeVisitScheduled with the date', () => {
    return pact
      .given('rescue staff schedule a home visit')
      .expectsToReceive('applications.homeVisitScheduled event')
      .withContent({
        applicationId: like('app-001'),
        adopterId: like('usr-adopter'),
        rescueId: like('rescue-001'),
        scheduledAt: regex(ISO_8601, '2026-06-10T14:00:00.000Z'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<ApplicationHomeVisitScheduledEvent>(
            'applications.homeVisitScheduled',
            body,
            ['applicationId', 'adopterId', 'rescueId', 'scheduledAt']
          );
          const create = buildApplicationHomeVisitScheduledCreate(event);
          expect(create.userId).toBe('usr-adopter');
          expect(create.relatedEntityId).toBe('app-001');
          expect(dataOf(create.dataJson)).toEqual({
            applicationId: 'app-001',
            rescueId: 'rescue-001',
            scheduledAt: '2026-06-10T14:00:00.000Z',
          });
        })
      );
  });

  it('notifies the adopter of applications.homeVisitCompleted with the outcome', () => {
    return pact
      .given('rescue staff record a home visit outcome')
      .expectsToReceive('applications.homeVisitCompleted event')
      .withContent({
        applicationId: like('app-001'),
        adopterId: like('usr-adopter'),
        rescueId: like('rescue-001'),
        outcome: like('passed'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<ApplicationHomeVisitCompletedEvent>(
            'applications.homeVisitCompleted',
            body,
            ['applicationId', 'adopterId', 'rescueId', 'outcome']
          );
          const create = buildApplicationHomeVisitCompletedCreate(event);
          expect(create.userId).toBe('usr-adopter');
          expect(dataOf(create.dataJson)).toEqual({
            applicationId: 'app-001',
            rescueId: 'rescue-001',
            outcome: 'passed',
          });
        })
      );
  });

  it('notifies the adopter of applications.adopted', () => {
    return pact
      .given('rescue staff mark an approved application adopted')
      .expectsToReceive('applications.adopted event')
      .withContent(APPLICATION_IDS)
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<ApplicationAdoptedEvent>('applications.adopted', body, ID_FIELDS);
          const create = buildApplicationAdoptedCreate(event);
          expect(create.userId).toBe('usr-adopter');
          expect(create.relatedEntityId).toBe('app-001');
          expect(dataOf(create.dataJson)).toEqual({
            applicationId: 'app-001',
            petId: 'pet-001',
            rescueId: 'rescue-001',
          });
        })
      );
  });
});
