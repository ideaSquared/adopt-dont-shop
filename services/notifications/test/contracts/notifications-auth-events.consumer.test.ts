// Consumer-driven contract: notifications → auth.userLoggedIn, auth.roleAssigned
// (NATS events)
//
// service.notifications raises a security notification on every sign-in and
// announces a newly granted role (src/nats/subscribers.ts). Each interaction
// pins only the fields the matching build*Create translator reads, and feeds
// the message through it.
//
// Provider verification: services/auth/test/contracts/auth-events.provider.test.ts.
// See ADR 0005.

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MatchersV3, MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

import type { AuthRoleAssignedEvent, AuthUserLoggedInEvent } from '../../src/nats/event-types.js';
import {
  buildAuthRoleAssignedCreate,
  buildAuthUserLoggedInCreate,
} from '../../src/nats/subscribers.js';
import { eventBody } from './event-body.js';

const { like } = MatchersV3;

// Repo-root pacts/ directory: test/contracts/ → test/ → notifications/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const pact = new MessageConsumerPact({
  consumer: 'service.notifications',
  provider: 'service.auth',
  dir: PACT_DIR,
  logLevel: 'warn',
  pactfileWriteMode: 'update',
});

describe('notifications consumer → auth: auth.userLoggedIn, auth.roleAssigned', () => {
  it('raises a sign-in security notification from auth.userLoggedIn', () => {
    return pact
      .given('a user signs in from a known IP address and browser')
      .expectsToReceive('auth.userLoggedIn event')
      .withContent({
        userId: like('usr-001'),
        ipAddress: like('203.0.113.7'),
        userAgent: like('Mozilla/5.0'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<AuthUserLoggedInEvent>('auth.userLoggedIn', body, [
            'userId',
            'ipAddress',
            'userAgent',
          ]);
          const create = buildAuthUserLoggedInCreate(event);
          expect(create.userId).toBe('usr-001');
          expect(create.message).toContain('203.0.113.7');
          expect(create.message).toContain('Mozilla/5.0');
        })
      );
  });

  it('announces the new role from auth.roleAssigned', () => {
    return pact
      .given('an admin assigns a role with a reason')
      .expectsToReceive('auth.roleAssigned event')
      .withContent({
        targetUserId: like('usr-001'),
        role: like('rescue_staff'),
        assignedBy: like('usr-admin'),
        reason: like('Joined the rescue team'),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        synchronousBodyHandler(body => {
          const event = eventBody<AuthRoleAssignedEvent>('auth.roleAssigned', body, [
            'targetUserId',
            'role',
            'assignedBy',
            'reason',
          ]);
          const create = buildAuthRoleAssignedCreate(event);
          expect(create.userId).toBe('usr-001');
          expect(create.message).toContain('rescue_staff');
          expect(JSON.parse(create.dataJson)).toEqual({
            role: 'rescue_staff',
            assignedBy: 'usr-admin',
            reason: 'Joined the rescue team',
          });
        })
      );
  });
});
