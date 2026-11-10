// Provider verification: service.auth → auth.* NATS events
//
// Reads the pact files written by the consumers of service.auth's events:
//   - service.applications (auth.userProfileChanged)
//     services/applications/test/contracts/applications-auth-user-profile-changed.consumer.test.ts
//   - service.notifications (auth.userLoggedIn, auth.roleAssigned)
//     services/notifications/test/contracts/notifications-auth-events.consumer.test.ts
//
// Each message provider runs the real code that publishes the event — the
// login and assignRole handlers with a stubbed pool and a NATS double, and
// publishProfileChanged (the one builder every name / email edit goes
// through) — and returns the payload it actually published. See ADR 0005.

import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { MessageProviderPact } from '@pact-foundation/pact';

import type { DomainEvent } from '@adopt-dont-shop/events';
import { ADMIN_SECURITY_MANAGE, type UserId } from '@adopt-dont-shop/lib.types';
import { AuthV1 } from '@adopt-dont-shop/proto';
import { makeNatsDouble, testPrincipal } from '@adopt-dont-shop/test-utils';

import { assignRole, login, type HandlerDeps } from '../../src/grpc/handlers.js';
import { publishProfileChanged } from '../../src/grpc/profile-events.js';

// Repo-root pacts/ directory: test/contracts/ → test/ → auth/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const ADMIN = testPrincipal({
  userId: 'usr-admin' as UserId,
  roles: ['admin'],
  permissions: [ADMIN_SECURITY_MANAGE],
});

function userRow() {
  return {
    user_id: 'usr-001',
    email: 'alex@example.com',
    password: '$2b$10$hash',
    first_name: 'Alex',
    last_name: 'Jenkinson',
    email_verified: true,
    phone_verified: false,
    two_factor_enabled: false,
    two_factor_secret: null,
    two_factor_last_step: null,
    status: 'active',
    user_type: 'adopter',
    profile_image_url: null,
    bio: null,
    timezone: 'UTC',
    language: 'en',
    country: 'GB',
    city: 'London',
    last_login_at: null,
    locked_until: null,
    login_attempts: 0,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
  };
}

// The pool answers the handler's own reads in order (then empty rows); the
// transaction client answers every write and outbox query with no rows.
function makeDeps(poolRows: ReadonlyArray<ReadonlyArray<unknown>>) {
  const client = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }), release: vi.fn() };
  const poolQuery = vi.fn().mockResolvedValue({ rows: [] });
  poolRows.forEach(rows => poolQuery.mockResolvedValueOnce({ rows }));
  const pool = { connect: vi.fn().mockResolvedValue(client), query: poolQuery };
  const nats = makeNatsDouble();
  const deps: HandlerDeps = {
    // Only query/connect are exercised; the rest of pg.Pool is unused here.
    pool: pool as unknown as Pool,
    nats: nats.connection,
    passwordHasher: { compare: vi.fn().mockResolvedValue(true), hash: vi.fn() },
    tokenIssuer: {
      mint: vi.fn().mockResolvedValue({
        pair: {
          accessToken: 'access.jwt.token',
          refreshToken: 'refresh.jwt.token',
          accessExpiresAt: '2026-06-05T17:30:00Z',
          refreshExpiresAt: '2026-07-05T17:00:00Z',
        },
        accessJti: 'access-jti',
        accessExpiresAt: new Date('2026-06-05T17:30:00Z'),
        refreshJti: 'refresh-jti',
        refreshExpiresAt: new Date('2026-07-05T17:00:00Z'),
      }),
      verifyAccess: vi.fn(),
      verifyRefresh: vi.fn(),
    },
    encryptionKey: 'a'.repeat(64),
  };
  return { deps, nats };
}

function payloadPublishedOn(nats: ReturnType<typeof makeNatsDouble>, subject: string): unknown {
  const call = nats.published.find(c => c.subject === subject);
  if (!call?.data) {
    throw new Error(`nothing was published on ${subject}`);
  }
  const envelope: { payload: unknown } = JSON.parse(new TextDecoder().decode(call.data));
  return envelope.payload;
}

// --- Message providers ---------------------------------------------------

// "auth.userProfileChanged event" — state: 'a user changes their name and email'
function provideUserProfileChanged(): unknown {
  const published: DomainEvent[] = [];
  publishProfileChanged(event => published.push(event), {
    user_id: 'usr-001',
    first_name: 'Alex',
    last_name: 'Jenkinson',
    email: 'alex@example.com',
    updated_at: new Date('2026-06-18T10:00:00.000Z'),
  });
  const event = published.find(e => e.type === 'auth.userProfileChanged');
  if (!event) {
    throw new Error('nothing was published on auth.userProfileChanged');
  }
  return event.payload;
}

// "auth.userLoggedIn event" — state: 'a user signs in from a known IP address and browser'
async function provideUserLoggedIn(): Promise<unknown> {
  const { deps, nats } = makeDeps([
    [userRow()], // the credential lookup
    [{ user_type: 'adopter' }], // after-commit principal load: user type
    [], // extra roles
    [{ name: 'pets.read' }], // permissions
  ]);
  await login(deps, null, {
    email: 'alex@example.com',
    password: 'hunter2',
    ipAddress: '203.0.113.7',
    userAgent: 'Mozilla/5.0',
  });
  return payloadPublishedOn(nats, 'auth.userLoggedIn');
}

// "auth.roleAssigned event" — state: 'an admin assigns a role with a reason'
async function provideRoleAssigned(): Promise<unknown> {
  const { deps, nats } = makeDeps([
    [{ user_id: 'usr-001' }], // target user exists
    [{ role_id: 'role-1' }], // role is provisioned
    [{ user_type: 'adopter' }], // post-assignment principal load
    [{ name: 'rescue_staff' }],
    [],
  ]);
  await assignRole(deps, ADMIN, {
    targetUserId: 'usr-001',
    role: AuthV1.UserRole.USER_ROLE_RESCUE_STAFF,
    reason: 'Joined the rescue team',
  });
  return payloadPublishedOn(nats, 'auth.roleAssigned');
}

// --- Verification suites -------------------------------------------------

describe('service.auth — provider verification for auth.* events', () => {
  it('fulfils the auth.userProfileChanged interaction declared by service.applications', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.auth',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.applications-service.auth.json')],
      messageProviders: { 'auth.userProfileChanged event': provideUserProfileChanged },
    });
    await expect(verifier.verify()).resolves.not.toThrow();
  });

  it('fulfils the auth.userLoggedIn and auth.roleAssigned interactions declared by service.notifications', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.auth',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.notifications-service.auth.json')],
      messageProviders: {
        'auth.userLoggedIn event': provideUserLoggedIn,
        'auth.roleAssigned event': provideRoleAssigned,
      },
    });
    await expect(verifier.verify()).resolves.not.toThrow();
  });
});
