// Provider verification: service.applications → applications.* NATS events
//
// Reads the pact file written by
// services/notifications/test/contracts/notifications-applications-events.consumer.test.ts
// and proves the application lifecycle events carry what service.notifications
// reads.
//
// Each message provider runs the real command handler against a stubbed event
// stream (the aggregate is event-sourced: loading it folds the stored events)
// with a NATS double, and returns the payload it actually published. See
// ADR 0005.

import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { MessageProviderPact } from '@pact-foundation/pact';

import {
  APPLICATIONS_APPROVE,
  APPLICATIONS_PROCESS,
  APPLICATIONS_REJECT,
  APPLICATIONS_UPDATE,
  type RescueId,
  type UserId,
} from '@adopt-dont-shop/lib.types';
import { ApplicationsV1 } from '@adopt-dont-shop/proto';
import { makeNatsDouble, testPrincipal } from '@adopt-dont-shop/test-utils';

import type { HandlerDeps } from '../../src/grpc/adapter.js';
import { submitDraft } from '../../src/grpc/handlers.js';
import {
  approve,
  completeHomeVisit,
  markAdopted,
  reject,
  scheduleHomeVisit,
} from '../../src/grpc/review-handlers.js';

// Repo-root pacts/ directory: test/contracts/ → test/ → applications/ → services/ → root/ → pacts/
const PACT_DIR = resolve(__dirname, '../../../../pacts');

const APPLICATION_ID = 'app-001';

const ADOPTER = testPrincipal({
  userId: 'usr-adopter' as UserId,
  permissions: [APPLICATIONS_UPDATE],
});

const STAFF = testPrincipal({
  userId: 'usr-staff' as UserId,
  roles: ['rescue_staff'],
  rescueId: 'rescue-001' as RescueId,
  permissions: [APPLICATIONS_PROCESS, APPLICATIONS_APPROVE, APPLICATIONS_REJECT],
});

// --- Event streams -------------------------------------------------------

function ev(type: string, version: number, extra: Record<string, unknown> = {}) {
  return {
    event_type: type,
    version,
    event_data: {
      type,
      applicationId: APPLICATION_ID,
      at: `2026-06-0${version}T12:00:00.000Z`,
      ...extra,
    },
  };
}

const draftStream = () => [
  ev('draftCreated', 1, { adopterId: 'usr-adopter', petId: 'pet-001', rescueId: 'rescue-001' }),
];

const underReviewStream = () => [
  ...draftStream(),
  ev('draftSubmitted', 2),
  ev('reviewStarted', 3, { actorUserId: 'usr-staff', note: null }),
];

const homeVisitScheduledStream = () => [
  ...underReviewStream(),
  ev('homeVisitScheduled', 4, {
    scheduledAt: '2026-06-10T14:00:00.000Z',
    actorUserId: 'usr-staff',
    note: null,
  }),
];

const decidableStream = () => [
  ...homeVisitScheduledStream(),
  ev('homeVisitCompleted', 5, { outcome: 'passed', actorUserId: 'usr-staff', notes: null }),
];

const approvedStream = () => [
  ...decidableStream(),
  ev('approved', 6, { actorUserId: 'usr-staff', notes: null }),
];

// Loading the aggregate returns the stream; every other query (appends, the
// read-model projection, home-visit rows, outbox plumbing) returns no rows.
function depsWithStream(stream: ReadonlyArray<ReturnType<typeof ev>>) {
  const query = vi.fn(async (sql: string) =>
    sql.includes('FROM application_events') ? { rows: stream } : { rows: [], rowCount: 1 }
  );
  const client = { query, release: vi.fn() };
  const pool = { connect: vi.fn().mockResolvedValue(client), query };
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

async function provideSubmitted(): Promise<unknown> {
  const { deps, nats } = depsWithStream(draftStream());
  await submitDraft(deps, ADOPTER, { applicationId: APPLICATION_ID, expectedVersion: 1 });
  return payloadPublishedOn(nats, 'applications.submitted');
}

async function provideApproved(): Promise<unknown> {
  const { deps, nats } = depsWithStream(decidableStream());
  await approve(deps, STAFF, { applicationId: APPLICATION_ID, notes: 'Great match' });
  return payloadPublishedOn(nats, 'applications.approved');
}

async function provideRejected(): Promise<unknown> {
  const { deps, nats } = depsWithStream(decidableStream());
  await reject(deps, STAFF, {
    applicationId: APPLICATION_ID,
    reason: 'Home unsuitable for a large dog',
  });
  return payloadPublishedOn(nats, 'applications.rejected');
}

async function provideHomeVisitScheduled(): Promise<unknown> {
  const { deps, nats } = depsWithStream(underReviewStream());
  await scheduleHomeVisit(deps, STAFF, {
    applicationId: APPLICATION_ID,
    scheduledAt: '2026-06-10T14:00:00.000Z',
  });
  return payloadPublishedOn(nats, 'applications.homeVisitScheduled');
}

async function provideHomeVisitCompleted(): Promise<unknown> {
  const { deps, nats } = depsWithStream(homeVisitScheduledStream());
  await completeHomeVisit(deps, STAFF, {
    applicationId: APPLICATION_ID,
    outcome: ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_PASSED,
  });
  return payloadPublishedOn(nats, 'applications.homeVisitCompleted');
}

async function provideAdopted(): Promise<unknown> {
  const { deps, nats } = depsWithStream(approvedStream());
  await markAdopted(deps, STAFF, { applicationId: APPLICATION_ID });
  return payloadPublishedOn(nats, 'applications.adopted');
}

// --- Verification suite --------------------------------------------------

describe('service.applications — provider verification for applications.* events', () => {
  it('fulfils all interactions declared by service.notifications', async () => {
    const verifier = new MessageProviderPact({
      provider: 'service.applications',
      logLevel: 'warn',
      pactUrls: [resolve(PACT_DIR, 'service.notifications-service.applications.json')],
      messageProviders: {
        'applications.submitted event': provideSubmitted,
        'applications.approved event': provideApproved,
        'applications.rejected event with a reason': provideRejected,
        'applications.homeVisitScheduled event': provideHomeVisitScheduled,
        'applications.homeVisitCompleted event': provideHomeVisitCompleted,
        'applications.adopted event': provideAdopted,
      },
    });
    await expect(verifier.verify()).resolves.not.toThrow();
  });
});
