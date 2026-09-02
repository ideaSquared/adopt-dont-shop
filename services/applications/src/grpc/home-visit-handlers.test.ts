import { describe, expect, it, vi } from 'vitest';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { listHomeVisits, updateHomeVisit } from './home-visit-handlers.js';

function makePrincipal(
  overrides: Partial<{
    userId: string;
    roles: string[];
    permissions: string[];
    rescueId: string;
  }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['applications.read', 'applications.update'],
    ...(overrides.rescueId !== undefined ? { rescueId: overrides.rescueId } : {}),
  } as unknown as Parameters<typeof listHomeVisits>[1];
}

function makeDeps(): { deps: HandlerDeps; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn();
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

function ownerRow(overrides: Partial<{ user_id: string; rescue_id: string; status: string }> = {}) {
  return {
    user_id: overrides.user_id ?? 'usr-1',
    rescue_id: overrides.rescue_id ?? 'rsc-1',
    status: overrides.status ?? 'submitted',
  };
}

const visitRow = {
  visit_id: 'visit-1',
  application_id: 'app-1',
  scheduled_date: '2026-06-10',
  scheduled_time: '14:00:00',
  assigned_staff: 'staff-1',
  status: 'scheduled',
  notes: 'bring a leash',
  outcome: null,
  outcome_notes: null,
  reschedule_reason: null,
  cancelled_reason: null,
  completed_at: null,
  created_at: new Date('2026-06-01T10:00:00.000Z'),
  updated_at: new Date('2026-06-01T10:00:00.000Z'),
};

describe('listHomeVisits', () => {
  it('throws INVALID_ARGUMENT when application_id is empty', async () => {
    const { deps, query } = makeDeps();
    await expect(
      listHomeVisits(deps, makePrincipal(), { applicationId: '' })
    ).rejects.toBeInstanceOf(HandlerError);
    expect(query).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND when the application does not exist', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });
    await expect(
      listHomeVisits(deps, makePrincipal(), { applicationId: 'missing' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('denies an adopter who is not the application owner', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'someone-else' })] });
    await expect(
      listHomeVisits(deps, makePrincipal({ userId: 'usr-1' }), { applicationId: 'app-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  // ADS-1261: home visits on a draft application are private to the owning adopter.
  it('denies rescue staff reading home visits on a draft application', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ status: 'draft' })] });
    await expect(
      listHomeVisits(
        deps,
        makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-1' }),
        { applicationId: 'app-1' }
      )
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('lets the owning adopter read home visits on their own draft', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1', status: 'draft' })] })
      .mockResolvedValueOnce({ rows: [visitRow] });
    const res = await listHomeVisits(deps, makePrincipal({ userId: 'usr-1' }), {
      applicationId: 'app-1',
    });
    expect(res.visits).toHaveLength(1);
  });

  it('lets the owning adopter list their visits, newest first', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'usr-1' })] })
      .mockResolvedValueOnce({ rows: [visitRow] });

    const res = await listHomeVisits(deps, makePrincipal({ userId: 'usr-1' }), {
      applicationId: 'app-1',
    });

    expect(res.visits).toHaveLength(1);
    expect(res.visits[0]).toEqual({
      visitId: 'visit-1',
      applicationId: 'app-1',
      scheduledDate: '2026-06-10',
      scheduledTime: '14:00:00',
      assignedStaff: 'staff-1',
      status: 'scheduled',
      notes: 'bring a leash',
      createdAt: '2026-06-01T10:00:00.000Z',
      updatedAt: '2026-06-01T10:00:00.000Z',
    });
  });

  it('lets rescue staff of the application rescue list visits', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow({ user_id: 'other', rescue_id: 'rsc-9' })] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await listHomeVisits(
      deps,
      makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-9' }),
      { applicationId: 'app-1' }
    );

    expect(res.visits).toEqual([]);
  });
});

describe('updateHomeVisit', () => {
  it('throws INVALID_ARGUMENT when visit_id is empty', async () => {
    const { deps, query } = makeDeps();
    await expect(
      updateHomeVisit(deps, makePrincipal(), { applicationId: 'app-1', visitId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(query).not.toHaveBeenCalled();
  });

  it('throws PERMISSION_DENIED without applications.review scoped to the rescue', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ rescue_id: 'rsc-1' })] });
    await expect(
      updateHomeVisit(
        deps,
        makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-9' }),
        { applicationId: 'app-1', visitId: 'visit-1' }
      )
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('throws NOT_FOUND when the visit does not belong to the application', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow()] }).mockResolvedValueOnce({ rows: [] });
    await expect(
      updateHomeVisit(
        deps,
        makePrincipal({
          userId: 'staff-1',
          roles: ['rescue_staff'],
          rescueId: 'rsc-1',
          permissions: ['applications.review'],
        }),
        { applicationId: 'app-1', visitId: 'missing' }
      )
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws INVALID_ARGUMENT on an unrecognised status', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow()] }).mockResolvedValueOnce({ rows: [visitRow] });
    await expect(
      updateHomeVisit(
        deps,
        makePrincipal({
          userId: 'staff-1',
          roles: ['rescue_staff'],
          rescueId: 'rsc-1',
          permissions: ['applications.review'],
        }),
        { applicationId: 'app-1', visitId: 'visit-1', status: 'bogus' }
      )
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws INVALID_ARGUMENT on an illegal status transition', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow()] }).mockResolvedValueOnce({
      rows: [{ ...visitRow, status: 'completed' }],
    });
    await expect(
      updateHomeVisit(
        deps,
        makePrincipal({
          userId: 'staff-1',
          roles: ['rescue_staff'],
          rescueId: 'rsc-1',
          permissions: ['applications.review'],
        }),
        { applicationId: 'app-1', visitId: 'visit-1', status: 'in_progress' }
      )
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws INVALID_ARGUMENT on an unrecognised outcome', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow()] }).mockResolvedValueOnce({ rows: [visitRow] });
    await expect(
      updateHomeVisit(
        deps,
        makePrincipal({
          userId: 'staff-1',
          roles: ['rescue_staff'],
          rescueId: 'rsc-1',
          permissions: ['applications.review'],
        }),
        { applicationId: 'app-1', visitId: 'visit-1', outcome: 'bogus' }
      )
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('marks the visit in_progress and logs the transition', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow()] })
      .mockResolvedValueOnce({ rows: [visitRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ ...visitRow, status: 'in_progress' }] });

    const res = await updateHomeVisit(
      deps,
      makePrincipal({
        userId: 'staff-1',
        roles: ['rescue_staff'],
        rescueId: 'rsc-1',
        permissions: ['applications.review'],
      }),
      { applicationId: 'app-1', visitId: 'visit-1', status: 'in_progress' }
    );

    expect(res.visit?.status).toBe('in_progress');
    const transitionCall = query.mock.calls.find(([sql]) =>
      (sql as string).includes('INSERT INTO home_visit_status_transitions')
    );
    expect(transitionCall?.[1]).toEqual([
      expect.any(String),
      'visit-1',
      'scheduled',
      'in_progress',
      'staff-1',
      null,
    ]);
  });

  it('reschedules without a status change and skips the transition log', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow()] })
      .mockResolvedValueOnce({ rows: [visitRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ ...visitRow, scheduled_date: '2026-06-15' }] });

    const res = await updateHomeVisit(
      deps,
      makePrincipal({
        userId: 'staff-1',
        roles: ['rescue_staff'],
        rescueId: 'rsc-1',
        permissions: ['applications.review'],
      }),
      {
        applicationId: 'app-1',
        visitId: 'visit-1',
        scheduledDate: '2026-06-15',
        scheduledTime: '10:00:00',
      }
    );

    expect(res.visit?.scheduledDate).toBe('2026-06-15');
    const transitionCall = query.mock.calls.find(([sql]) =>
      (sql as string).includes('INSERT INTO home_visit_status_transitions')
    );
    expect(transitionCall).toBeUndefined();
  });

  it('completes the visit with outcome + notes', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [ownerRow()] })
      .mockResolvedValueOnce({ rows: [{ ...visitRow, status: 'in_progress' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            ...visitRow,
            status: 'completed',
            outcome: 'approved',
            completed_at: new Date('2026-06-10T15:00:00.000Z'),
          },
        ],
      });

    const res = await updateHomeVisit(
      deps,
      makePrincipal({
        userId: 'staff-1',
        roles: ['rescue_staff'],
        rescueId: 'rsc-1',
        permissions: ['applications.review'],
      }),
      {
        applicationId: 'app-1',
        visitId: 'visit-1',
        status: 'completed',
        outcome: 'approved',
        completedAt: '2026-06-10T15:00:00.000Z',
      }
    );

    expect(res.visit?.status).toBe('completed');
    expect(res.visit?.outcome).toBe('approved');
    expect(res.visit?.completedAt).toBe('2026-06-10T15:00:00.000Z');
  });

  // ADS-1272 (defence-in-depth): home visits are a post-submission staff action
  // — even staff of the owning rescue must not mutate one while the application
  // is still a private draft.
  it('denies updating a home visit on a draft application', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [ownerRow({ status: 'draft' })] });
    await expect(
      updateHomeVisit(
        deps,
        makePrincipal({
          userId: 'staff-1',
          roles: ['rescue_staff'],
          rescueId: 'rsc-1',
          permissions: ['applications.review'],
        }),
        { applicationId: 'app-1', visitId: 'visit-1', status: 'in_progress' }
      )
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    // Never reaches the visit SELECT.
    expect(query).toHaveBeenCalledTimes(1);
  });
});
