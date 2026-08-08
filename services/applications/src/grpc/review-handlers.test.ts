import { describe, expect, it, vi } from 'vitest';

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import {
  approve,
  completeHomeVisit,
  markAdopted,
  reject,
  scheduleHomeVisit,
  startReview,
  withdraw,
} from './review-handlers.js';

function makePrincipal(
  overrides: Partial<{ userId: string; permissions: string[]; roles: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'staff-1',
    roles: overrides.roles ?? ['rescue_staff'],
    permissions: overrides.permissions ?? [
      'applications.review',
      'applications.approve',
      'applications.reject',
      'applications.update',
    ],
    rescueId: 'rsc-1',
  } as unknown as Parameters<typeof startReview>[1];
}

function makeDeps(eventRows: Array<unknown>): {
  deps: HandlerDeps;
  query: ReturnType<typeof vi.fn>;
} {
  const query = vi.fn();
  query.mockResolvedValueOnce({ rows: eventRows });
  query.mockResolvedValue({ rows: [] });
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

vi.mock('@adopt-dont-shop/events', async () => {
  const actual =
    await vi.importActual<typeof import('@adopt-dont-shop/events')>('@adopt-dont-shop/events');
  return {
    ...actual,
    withTransaction: async (
      deps: { pool: { query: ReturnType<typeof vi.fn> } },
      fn: (scope: {
        client: { query: ReturnType<typeof vi.fn> };
        publish: ReturnType<typeof vi.fn>;
      }) => Promise<unknown>
    ) => {
      const publish = vi.fn();
      const client = { query: deps.pool.query };
      const result = await fn({ client, publish });
      (deps as { _publish?: ReturnType<typeof vi.fn> })._publish = publish;
      return result;
    },
  };
});

function ev(type: string, version: number, extra: Record<string, unknown> = {}) {
  return {
    event_type: type,
    version,
    event_data: {
      type,
      applicationId: 'app-1',
      at: `2026-06-0${version}T12:00:00.000Z`,
      ...extra,
    },
  };
}

// A submitted application: draftCreated (v1) + draftSubmitted (v2).
function submittedStream() {
  return [
    ev('draftCreated', 1, {
      adopterId: 'usr-1',
      petId: 'pet-1',
      rescueId: 'rsc-1',
    }),
    ev('draftSubmitted', 2),
  ];
}

// A stream advanced to under_review.
function underReviewStream() {
  return [...submittedStream(), ev('reviewStarted', 3, { actorUserId: 'staff-1', note: null })];
}

function publishOf(deps: HandlerDeps): ReturnType<typeof vi.fn> {
  return (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
}

// The projectReadModel UPSERT is the last query call in a runCommand
// flow. Its actioned_at param (ADS-1025) is what the query.mock.calls
// give us to check without a real DB — see event-store.ts.
function actionedAtParam(query: ReturnType<typeof vi.fn>): unknown {
  const insertCall = query.mock.calls.find(([sql]) =>
    (sql as string).includes('INSERT INTO applications')
  );
  return insertCall?.[1]?.[7];
}

describe('startReview', () => {
  it('throws PERMISSION_DENIED without applications.review', async () => {
    const { deps } = makeDeps(submittedStream());
    await expect(
      startReview(deps, makePrincipal({ permissions: [] }), { applicationId: 'app-1' })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws INVALID_ARGUMENT on missing application_id', async () => {
    const { deps } = makeDeps([]);
    await expect(startReview(deps, makePrincipal(), { applicationId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('transitions submitted → under_review + publishes reviewStarted', async () => {
    const { deps } = makeDeps(submittedStream());
    const res = await startReview(deps, makePrincipal(), { applicationId: 'app-1', note: 'go' });
    expect(res.application.status).toBe(
      ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNDER_REVIEW
    );
    expect(publishOf(deps).mock.calls[0][0]).toMatchObject({ type: 'applications.reviewStarted' });
  });
});

describe('scheduleHomeVisit', () => {
  it('throws INVALID_ARGUMENT on missing scheduled_at', async () => {
    const { deps } = makeDeps(underReviewStream());
    await expect(
      scheduleHomeVisit(deps, makePrincipal(), { applicationId: 'app-1', scheduledAt: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('transitions under_review → home_visit_scheduled', async () => {
    const { deps } = makeDeps(underReviewStream());
    const res = await scheduleHomeVisit(deps, makePrincipal(), {
      applicationId: 'app-1',
      scheduledAt: '2026-06-10T14:00:00.000Z',
    });
    expect(res.application.status).toBe(
      ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_HOME_VISIT_SCHEDULED
    );
    expect(publishOf(deps).mock.calls[0][0]).toMatchObject({
      type: 'applications.homeVisitScheduled',
    });
  });

  // ADS-1152: scheduleHomeVisit seeds the granular home_visits row that
  // UpdateHomeVisit later drives.
  it('inserts a home_visits row + opening transition when none is active', async () => {
    const { deps, query } = makeDeps(underReviewStream());
    await scheduleHomeVisit(deps, makePrincipal({ userId: 'staff-1' }), {
      applicationId: 'app-1',
      scheduledAt: '2026-06-10T14:00:00.000Z',
      note: 'bring a leash',
    });

    const insertVisit = query.mock.calls.find(([sql]) =>
      (sql as string).includes('INSERT INTO home_visits')
    );
    expect(insertVisit?.[1]).toEqual([
      expect.any(String),
      'app-1',
      '2026-06-10',
      '14:00:00',
      'bring a leash',
      'staff-1',
    ]);
    const insertTransition = query.mock.calls.find(([sql]) =>
      (sql as string).includes('INSERT INTO home_visit_status_transitions')
    );
    expect(insertTransition).toBeDefined();
  });

  it('updates the existing active home_visits row instead of inserting a new one', async () => {
    const { deps, query } = makeDeps(underReviewStream());
    query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT visit_id FROM home_visits')) {
        return Promise.resolve({ rows: [{ visit_id: 'visit-9' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await scheduleHomeVisit(deps, makePrincipal({ userId: 'staff-1' }), {
      applicationId: 'app-1',
      scheduledAt: '2026-06-11T09:30:00.000Z',
    });

    const update = query.mock.calls.find(([sql]) => (sql as string).includes('UPDATE home_visits'));
    expect(update?.[1]).toEqual(['2026-06-11', '09:30:00', null, 'staff-1', 'visit-9']);
    const insertVisit = query.mock.calls.find(([sql]) =>
      (sql as string).includes('INSERT INTO home_visits')
    );
    expect(insertVisit).toBeUndefined();
  });
});

describe('completeHomeVisit', () => {
  it('throws INVALID_ARGUMENT on UNSPECIFIED outcome', async () => {
    const { deps } = makeDeps([
      ...underReviewStream(),
      ev('homeVisitScheduled', 4, {
        scheduledAt: '2026-06-10T14:00:00.000Z',
        actorUserId: 'staff-1',
        note: null,
      }),
    ]);
    await expect(
      completeHomeVisit(deps, makePrincipal(), {
        applicationId: 'app-1',
        outcome: ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_UNSPECIFIED,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('transitions home_visit_scheduled → home_visit_completed with outcome', async () => {
    const { deps } = makeDeps([
      ...underReviewStream(),
      ev('homeVisitScheduled', 4, {
        scheduledAt: '2026-06-10T14:00:00.000Z',
        actorUserId: 'staff-1',
        note: null,
      }),
    ]);
    const res = await completeHomeVisit(deps, makePrincipal(), {
      applicationId: 'app-1',
      outcome: ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_PASSED,
      notes: 'great fit',
    });
    expect(res.application.status).toBe(
      ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_HOME_VISIT_COMPLETED
    );
    expect(res.application.homeVisitOutcome).toBe(
      ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_PASSED
    );
  });
});

// A stream advanced to home_visit_completed (passed) — ready for a
// decision.
function decidableStream() {
  return [
    ...underReviewStream(),
    ev('homeVisitScheduled', 4, {
      scheduledAt: '2026-06-10T14:00:00.000Z',
      actorUserId: 'staff-1',
      note: null,
    }),
    ev('homeVisitCompleted', 5, { outcome: 'passed', actorUserId: 'staff-1', notes: null }),
  ];
}

describe('approve', () => {
  it('throws PERMISSION_DENIED without applications.approve', async () => {
    const { deps } = makeDeps(decidableStream());
    await expect(
      approve(deps, makePrincipal({ permissions: ['applications.review'] }), {
        applicationId: 'app-1',
      })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('transitions home_visit_completed → approved + publishes approved', async () => {
    const { deps } = makeDeps(decidableStream());
    const res = await approve(deps, makePrincipal(), { applicationId: 'app-1', notes: 'ok' });
    expect(res.application.status).toBe(
      ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_APPROVED
    );
    expect(publishOf(deps).mock.calls[0][0]).toMatchObject({ type: 'applications.approved' });
  });

  // ADS-1025 — the attribution query filters on actioned_at, stamped by
  // projectReadModel when the fold reaches approved/adopted.
  it('stamps actioned_at with the approved event’s own timestamp', async () => {
    const { deps, query } = makeDeps(decidableStream());
    const res = await approve(deps, makePrincipal(), { applicationId: 'app-1', notes: 'ok' });
    expect(res.application.decidedAt).toBeTruthy();
    expect(actionedAtParam(query)).toBe(res.application.decidedAt);
  });
});

describe('reject', () => {
  it('throws INVALID_ARGUMENT on missing reason', async () => {
    const { deps } = makeDeps(decidableStream());
    await expect(
      reject(deps, makePrincipal(), { applicationId: 'app-1', reason: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('transitions to rejected with a reason + publishes rejected', async () => {
    const { deps } = makeDeps(decidableStream());
    const res = await reject(deps, makePrincipal(), {
      applicationId: 'app-1',
      reason: 'home unsuitable',
    });
    expect(res.application.status).toBe(
      ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_REJECTED
    );
    expect(res.application.rejectionReason).toBe('home unsuitable');
    expect(publishOf(deps).mock.calls[0][0]).toMatchObject({ type: 'applications.rejected' });
  });

  // ADS-1025 — rejected never qualifies for CountAdoptedAdopters, so
  // actioned_at must stay unset even though the application was decided.
  it('leaves actioned_at unset on a rejected application', async () => {
    const { deps, query } = makeDeps(decidableStream());
    await reject(deps, makePrincipal(), { applicationId: 'app-1', reason: 'home unsuitable' });
    expect(actionedAtParam(query)).toBeNull();
  });
});

describe('withdraw', () => {
  it('transitions to withdrawn + publishes withdrawn', async () => {
    const { deps } = makeDeps(submittedStream());
    const res = await withdraw(deps, makePrincipal(), {
      applicationId: 'app-1',
      reason: 'found another pet',
    });
    expect(res.application.status).toBe(
      ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_WITHDRAWN
    );
    expect(publishOf(deps).mock.calls[0][0]).toMatchObject({ type: 'applications.withdrawn' });
  });
});

// The application stream is owned by rescue rsc-1 / adopter usr-1. A
// principal that holds the permission but belongs to a DIFFERENT rescue
// must not be able to drive another rescue's application lifecycle.
describe('cross-rescue authorization', () => {
  it('denies startReview from a staffer of another rescue', async () => {
    const foreign = {
      userId: 'staff-9',
      roles: ['rescue_staff'],
      permissions: [
        'applications.review',
        'applications.approve',
        'applications.reject',
        'applications.update',
      ],
      rescueId: 'rsc-2',
    } as unknown as Parameters<typeof startReview>[1];
    const { deps } = makeDeps(submittedStream());
    await expect(startReview(deps, foreign, { applicationId: 'app-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('denies approve / reject / markAdopted from a foreign rescue', async () => {
    const foreign = {
      userId: 'staff-9',
      roles: ['rescue_staff'],
      permissions: [
        'applications.review',
        'applications.approve',
        'applications.reject',
        'applications.update',
      ],
      rescueId: 'rsc-2',
    } as unknown as Parameters<typeof approve>[1];

    const a = makeDeps(decidableStream());
    await expect(approve(a.deps, foreign, { applicationId: 'app-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });

    const r = makeDeps(decidableStream());
    await expect(
      reject(r.deps, foreign, { applicationId: 'app-1', reason: 'no' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });

    const m = makeDeps([
      ...decidableStream(),
      ev('approved', 6, { actorUserId: 'staff-1', notes: null }),
    ]);
    await expect(markAdopted(m.deps, foreign, { applicationId: 'app-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('lets the owning adopter withdraw but denies an unrelated user', async () => {
    const owner = {
      userId: 'usr-1',
      roles: ['adopter'],
      permissions: ['applications.update'],
    } as unknown as Parameters<typeof withdraw>[1];
    const ok = makeDeps(submittedStream());
    await expect(withdraw(ok.deps, owner, { applicationId: 'app-1' })).resolves.toBeDefined();

    const stranger = {
      userId: 'usr-2',
      roles: ['adopter'],
      permissions: ['applications.update'],
    } as unknown as Parameters<typeof withdraw>[1];
    const no = makeDeps(submittedStream());
    await expect(withdraw(no.deps, stranger, { applicationId: 'app-1' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });
});

describe('markAdopted', () => {
  it('throws PERMISSION_DENIED without applications.approve', async () => {
    const { deps } = makeDeps([
      ...decidableStream(),
      ev('approved', 6, { actorUserId: 'staff-1', notes: null }),
    ]);
    await expect(
      markAdopted(deps, makePrincipal({ permissions: ['applications.review'] }), {
        applicationId: 'app-1',
      })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('transitions approved → adopted + publishes adopted', async () => {
    const { deps } = makeDeps([
      ...decidableStream(),
      ev('approved', 6, { actorUserId: 'staff-1', notes: null }),
    ]);
    const res = await markAdopted(deps, makePrincipal(), { applicationId: 'app-1' });
    expect(res.application.status).toBe(
      ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_ADOPTED
    );
    expect(publishOf(deps).mock.calls[0][0]).toMatchObject({ type: 'applications.adopted' });
  });

  // ADS-1025 — once adopted, actioned_at tracks the later `adopted` event
  // (not the earlier `approved` one), matching "reached APPROVED/ADOPTED".
  it('re-stamps actioned_at with the adopted event’s (later) timestamp', async () => {
    const { deps, query } = makeDeps([
      ...decidableStream(),
      ev('approved', 6, { actorUserId: 'staff-1', notes: null }),
    ]);
    const res = await markAdopted(deps, makePrincipal(), { applicationId: 'app-1' });
    expect(res.application.adoptedAt).toBeTruthy();
    expect(res.application.adoptedAt).not.toBe(res.application.decidedAt);
    expect(actionedAtParam(query)).toBe(res.application.adoptedAt);
  });
});
