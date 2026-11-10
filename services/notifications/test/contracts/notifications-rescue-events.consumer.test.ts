// Consumer-driven contract: notifications → rescue.* (NATS events)
//
// service.notifications consumes four rescue events (src/nats/subscribers.ts
// and src/nats/auth-emails.ts):
//   - rescue.verified / rescue.rejected — fanned out to the rescue's staff,
//     looked up by rescueId, through build*Create.
//   - rescue.staffInvited — emails the invitee the accept link built from the
//     one-time token, unless the invitation has expired.
//   - rescue.staffInvitationCancelled — logged with its ids.
// Each interaction pins only the fields the subscriber reads.
//
// Provider verification: services/rescue/test/contracts/rescue-events.provider.test.ts.
// See ADR 0005.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MatchersV3, MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

import { renderStaffInvitationEmail } from '../../src/nats/auth-emails.js';
import type {
  RescueRejectedEvent,
  RescueStaffInvitationCancelledEvent,
  RescueStaffInvitedEvent,
  RescueVerifiedEvent,
} from '../../src/nats/event-types.js';
import {
  buildRescueRejectedCreate,
  buildRescueVerifiedCreate,
} from '../../src/nats/subscribers.js';
import { eventBody } from './event-body.js';

const { like, regex } = MatchersV3;

// Repo-root pacts/ directory: test/contracts/ → test/ → notifications/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const ISO_8601 = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$';

const pact = new MessageConsumerPact({
  consumer: 'service.notifications',
  provider: 'service.rescue',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

describe('notifications consumer → rescue: rescue.*', () => {
  it("tells the rescue's staff about rescue.verified", () => {
    return pact
      .given('an admin verifies a pending rescue')
      .expectsToReceive('rescue.verified event')
      .withContent({
        rescueId: like('rescue-001'),
        fromStatus: like('pending'),
        toStatus: like('verified'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<RescueVerifiedEvent>('rescue.verified', body, [
            'rescueId',
            'fromStatus',
            'toStatus',
          ]);
          const create = buildRescueVerifiedCreate(event, 'Happy Paws', 'usr-staff');
          expect(create.relatedEntityId).toBe('rescue-001');
          expect(JSON.parse(create.dataJson)).toEqual({
            rescueId: 'rescue-001',
            fromStatus: 'pending',
            toStatus: 'verified',
          });
        })
      );
  });

  it("tells the rescue's staff about rescue.rejected with the reason", () => {
    return pact
      .given('an admin rejects a pending rescue with a reason')
      .expectsToReceive('rescue.rejected event with a reason')
      .withContent({
        rescueId: like('rescue-001'),
        reason: like('Charity number could not be confirmed'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<RescueRejectedEvent>('rescue.rejected', body, [
            'rescueId',
            'reason',
          ]);
          const create = buildRescueRejectedCreate(event, 'Happy Paws', 'usr-staff');
          expect(create.relatedEntityId).toBe('rescue-001');
          expect(create.message).toContain('Charity number could not be confirmed');
        })
      );
  });

  it('emails the invitee the accept link from rescue.staffInvited', () => {
    return pact
      .given('a rescue invites a new staff member by email')
      .expectsToReceive('rescue.staffInvited event with a token')
      .withContent({
        email: like('new.staff@example.com'),
        token: like('one-time-token'),
        expiration: regex(ISO_8601, '2026-06-25T10:00:00.000Z'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<RescueStaffInvitedEvent>('rescue.staffInvited', body, [
            'email',
            'token',
            'expiration',
          ]);
          expect(Number.isNaN(Date.parse(event.expiration))).toBe(false);
          const email = renderStaffInvitationEmail(event, 'https://rescue.example.com');
          expect(email.text).toContain('one-time-token');
        })
      );
  });

  it('logs rescue.staffInvitationCancelled with its ids', () => {
    return pact
      .given('an admin cancels a pending staff invitation')
      .expectsToReceive('rescue.staffInvitationCancelled event')
      .withContent({ invitationId: like('inv-001'), rescueId: like('rescue-001') })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<RescueStaffInvitationCancelledEvent>(
            'rescue.staffInvitationCancelled',
            body,
            ['invitationId', 'rescueId']
          );
          expect(event.invitationId).toBe('inv-001');
          expect(event.rescueId).toBe('rescue-001');
        })
      );
  });
});
