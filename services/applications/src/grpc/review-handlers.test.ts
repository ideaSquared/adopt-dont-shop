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
});
