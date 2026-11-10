// Provider verification: service.rescue → rescue.* NATS events
//
// Reads the pact file written by
// services/notifications/test/contracts/notifications-rescue-events.consumer.test.ts
// and proves rescue.verified, rescue.rejected, rescue.staffInvited and
// rescue.staffInvitationCancelled carry what service.notifications reads.
//
// Each message provider runs the real handler that publishes the event, with
// a stubbed pool and a NATS double, and returns the payload it actually
// published. See ADR 0005.

import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { MessageProviderPact } from '@pact-foundation/pact';

import { ADMIN_SECURITY_MANAGE, type UserId } from '@adopt-dont-shop/lib.types';
import { RescueV1 } from '@adopt-dont-shop/proto';
import { makeNatsDouble, testPrincipal } from '@adopt-dont-shop/test-utils';

import { inviteStaff, verifyRescue, type HandlerDeps } from '../../src/grpc/handlers.js';
import { cancelRescueInvitation } from '../../src/grpc/staff-foster-handlers.js';

// Repo-root pacts/ directory: test/contracts/ → test/ → rescue/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const RESCUE_ID = 'rescue-001';

const ADMIN = testPrincipal({
  userId: 'usr-admin' as UserId,
  roles: ['admin'],
  permissions: [ADMIN_SECURITY_MANAGE],
});

function rescueRow(overrides: Record<string, unknown> = {}) {
  return {
    rescue_id: RESCUE_ID,
    name: 'Happy Paws',
    email: 'hello@happypaws.example',
    phone: null,
    address: '1 High St',
    city: 'London',
    state: null,
    zip_code: 'SW1A 1AA',
    country: 'GB',
    website: null,
    description: null,
    mission: null,
    companies_house_number: null,
    charity_registration_number: null,
    contact_person: 'Alex',
    contact_title: null,
    contact_email: null,
    contact_phone: null,
    status: 'pending',
    verified_at: null,
    verified_by: null,
    verification_source: null,
    verification_failure_reason: null,
    settings: {},
    plan: 'free',
    plan_expires_at: null,
    version: 0,
    created_at: new Date('2026-06-01T00:00:00Z'),
    updated_at: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

// The pool answers reads with `poolRow`; the transaction client answers every
// write (and withTransaction's outbox plumbing) with `clientRow`.
function makeDeps(poolRow: unknown, clientRow: unknown) {
  const client = {
    query: vi.fn().mockResolvedValue({ rows: [clientRow], rowCount: 1 }),
    release: vi.fn(),
  };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn().mockResolvedValue({ rows: [poolRow] }),
  };
  const nats = makeNatsDouble();
  const deps: HandlerDeps = {
    // Only query/connect are exercised; the rest of pg.Pool is unused here.
    pool: pool as unknown as Pool,
    nats: nats.connection,
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

// "rescue.verified event" — state: 'an admin verifies a pending rescue'
async function provideVerified(): Promise<unknown> {
  const { deps, nats } = makeDeps(rescueRow(), rescueRow({ status: 'verified', version: 1 }));
  await verifyRescue(
    deps,
    ADMIN,
    RescueV1.VerifyRescueRequest.fromPartial({
      rescueId: RESCUE_ID,
      toStatus: RescueV1.RescueStatus.RESCUE_STATUS_VERIFIED,
      verificationSource: RescueV1.RescueVerificationSource.RESCUE_VERIFICATION_SOURCE_MANUAL,
    })
  );
  return payloadPublishedOn(nats, 'rescue.verified');
}

// "rescue.rejected event with a reason" — state: 'an admin rejects a pending rescue with a reason'
async function provideRejected(): Promise<unknown> {
  const { deps, nats } = makeDeps(rescueRow(), rescueRow({ status: 'rejected', version: 1 }));
  await verifyRescue(
    deps,
    ADMIN,
    RescueV1.VerifyRescueRequest.fromPartial({
      rescueId: RESCUE_ID,
      toStatus: RescueV1.RescueStatus.RESCUE_STATUS_REJECTED,
      failureReason: 'Charity number could not be confirmed',
    })
  );
  return payloadPublishedOn(nats, 'rescue.rejected');
}

// "rescue.staffInvited event with a token" — state: 'a rescue invites a new staff member by email'
async function provideStaffInvited(): Promise<unknown> {
  const { deps, nats } = makeDeps(rescueRow({ status: 'verified' }), {
    invitation_id: 'inv-001',
    email: 'new.staff@example.com',
    rescue_id: RESCUE_ID,
    user_id: null,
    title: null,
    invited_by: 'usr-admin',
    expiration: new Date('2026-06-25T10:00:00.000Z'),
    used: false,
    created_at: new Date('2026-06-18T10:00:00.000Z'),
  });
  await inviteStaff(
    deps,
    ADMIN,
    RescueV1.InviteStaffRequest.fromPartial({ rescueId: RESCUE_ID, email: 'new.staff@example.com' })
  );
  return payloadPublishedOn(nats, 'rescue.staffInvited');
}

// "rescue.staffInvitationCancelled event" — state: 'an admin cancels a pending staff invitation'
async function provideStaffInvitationCancelled(): Promise<unknown> {
  const { deps, nats } = makeDeps(undefined, {
    invitation_id: 'inv-001',
    email: 'new.staff@example.com',
  });
  await cancelRescueInvitation(deps, ADMIN, { rescueId: RESCUE_ID, invitationId: 'inv-001' });
  return payloadPublishedOn(nats, 'rescue.staffInvitationCancelled');
}

// --- Verification suite --------------------------------------------------

describe('service.rescue — provider verification for rescue.* events', () => {
  it('fulfils all interactions declared by service.notifications', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.rescue',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.notifications-service.rescue.json')],
      messageProviders: {
        'rescue.verified event': provideVerified,
        'rescue.rejected event with a reason': provideRejected,
        'rescue.staffInvited event with a token': provideStaffInvited,
        'rescue.staffInvitationCancelled event': provideStaffInvitationCancelled,
      },
    });
    await expect(verifier.verify()).resolves.not.toThrow();
  });
});
