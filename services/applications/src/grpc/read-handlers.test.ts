import { describe, expect, it, vi } from 'vitest';

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

import type { ApplicationEvent } from '../domain/index.js';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { getApplication, listApplications } from './read-handlers.js';

const S = ApplicationsV1.ApplicationStatus;

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
    permissions: overrides.permissions ?? ['applications.read'],
    ...(overrides.rescueId !== undefined ? { rescueId: overrides.rescueId } : {}),
  } as unknown as Parameters<typeof getApplication>[1];
}

function makeDeps(): { deps: HandlerDeps; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn();
  const pool = { query } as unknown as HandlerDeps['pool'];
  return { deps: { pool, nats: {} } as unknown as HandlerDeps, query };
}

// An event-store row as loadEventRows reads it.
function storeRow(version: number, event: ApplicationEvent, actor: string | null = null): unknown {
  return {
    event_id: `evt-${version}`,
    event_data: event,
    occurred_at: new Date(`2026-06-0${version}T12:00:00.000Z`),
    actor_user_id: actor,
    version,
  };
}

const draftCreated: ApplicationEvent = {
  type: 'draftCreated',
  applicationId: 'app-1',
  adopterId: 'usr-1',
  petId: 'pet-1',
  rescueId: 'rsc-1',
  at: '2026-06-01T12:00:00.000Z',
};

const draftSubmitted: ApplicationEvent = {
  type: 'draftSubmitted',
  applicationId: 'app-1',
  at: '2026-06-02T12:00:00.000Z',
};

// A submitted application's event-store rows (loadEventRows shape).
function submittedRows(): unknown[] {
  return [storeRow(1, draftCreated), storeRow(2, draftSubmitted)];
}

// A submitted application's rows as loadAggregate reads them (just
// event_data matters — fold ignores the rest).
function aggregateRows(): unknown[] {
  return [{ event_data: draftCreated }, { event_data: draftSubmitted }];
}

describe('getApplication', () => {
  it('throws INVALID_ARGUMENT on missing application_id', async () => {
    const { deps } = makeDeps();
    await expect(
      getApplication(deps, makePrincipal(), { applicationId: '', includeTimeline: false })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws NOT_FOUND for an unknown aggregate', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });
    await expect(
      getApplication(deps, makePrincipal(), { applicationId: 'app-x', includeTimeline: false })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('lets the owning adopter read their application', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: submittedRows() });
    const res = await getApplication(deps, makePrincipal(), {
      applicationId: 'app-1',
      includeTimeline: false,
    });
    expect(res.application.status).toBe(S.APPLICATION_STATUS_SUBMITTED);
    expect(res.application.adopterId).toBe('usr-1');
    expect(res.timeline).toEqual([]);
  });

  it('denies a different adopter', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: submittedRows() });
    await expect(
      getApplication(deps, makePrincipal({ userId: 'usr-2' }), {
        applicationId: 'app-1',
        includeTimeline: false,
      })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('lets rescue staff of the application’s rescue read it', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: submittedRows() });
    const res = await getApplication(
      deps,
      makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-1' }),
      { applicationId: 'app-1', includeTimeline: false }
    );
    expect(res.application.status).toBe(S.APPLICATION_STATUS_SUBMITTED);
  });

  // ADS-1261: a draft application is private to the owning adopter until it is
  // submitted — rescue staff are denied until it leaves draft.
  it('lets the owning adopter read their own draft', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [storeRow(1, draftCreated)] });
    const res = await getApplication(deps, makePrincipal(), {
      applicationId: 'app-1',
      includeTimeline: false,
    });
    expect(res.application.status).toBe(S.APPLICATION_STATUS_DRAFT);
    expect(res.application.adopterId).toBe('usr-1');
  });

  it('denies rescue staff reading a draft application', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [storeRow(1, draftCreated)] });
    await expect(
      getApplication(
        deps,
        makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-1' }),
        { applicationId: 'app-1', includeTimeline: false }
      )
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('includes the timeline when requested', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: submittedRows() });
    const res = await getApplication(deps, makePrincipal(), {
      applicationId: 'app-1',
      includeTimeline: true,
    });
    expect(res.timeline).toHaveLength(2);
    expect(res.timeline[1]).toMatchObject({ toStatus: S.APPLICATION_STATUS_SUBMITTED });
  });
});

describe('listApplications', () => {
  it('throws PERMISSION_DENIED without applications.read', async () => {
    const { deps } = makeDeps();
    await expect(
      listApplications(deps, makePrincipal({ permissions: [] }), {
        limit: 20,
        statusFilter: S.APPLICATION_STATUS_UNSPECIFIED,
      })
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('scopes an adopter to their own user id and folds each aggregate', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({
      rows: [{ application_id: 'app-1', created_at: new Date('2026-06-02T12:00:00.000Z') }],
    });
    query.mockResolvedValue({ rows: aggregateRows() });

    const res = await listApplications(deps, makePrincipal({ userId: 'usr-1' }), {
      limit: 20,
      statusFilter: S.APPLICATION_STATUS_UNSPECIFIED,
    });

    expect(res.applications).toHaveLength(1);
    expect(res.applications[0].status).toBe(S.APPLICATION_STATUS_SUBMITTED);
    // The index query is parameterised with the principal's own user id.
    const indexParams = query.mock.calls[0][1] as unknown[];
    expect(indexParams).toContain('usr-1');
    expect(res.nextCursor).toBeUndefined();
  });

  it('pins rescue staff to their own rescue', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });
    await listApplications(
      deps,
      makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-9' }),
      { limit: 20, statusFilter: S.APPLICATION_STATUS_UNSPECIFIED }
    );
    const indexParams = query.mock.calls[0][1] as unknown[];
    expect(indexParams).toContain('rsc-9');
  });

  it('applies a status filter as the DB enum string', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });
    await listApplications(deps, makePrincipal(), {
      limit: 20,
      statusFilter: S.APPLICATION_STATUS_APPROVED,
    });
    const indexParams = query.mock.calls[0][1] as unknown[];
    expect(indexParams).toContain('approved');
  });

  it('decodes a supplied cursor into a correctly-parameterised keyset predicate', async () => {
    const { deps, query } = makeDeps();
    query.mockResolvedValueOnce({ rows: [] });

    const cursor = Buffer.from(
      JSON.stringify({ createdAt: '2026-06-02T12:00:00.000Z', applicationId: 'app-1' }),
      'utf8'
    ).toString('base64url');

    await listApplications(deps, makePrincipal({ userId: 'usr-1' }), {
      limit: 20,
      statusFilter: S.APPLICATION_STATUS_UNSPECIFIED,
      cursor,
    });

    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    // user_id = $1, then the keyset predicate references $2 (created_at)
    // twice and $3 (application_id) once, LIMIT is the final placeholder.
    expect(sql).toContain('(created_at < $2 OR (created_at = $2 AND application_id < $3))');
    // $1 user id, $2 cursor created_at, $3 cursor application_id, $4 limit+1.
    expect(params).toEqual(['usr-1', '2026-06-02T12:00:00.000Z', 'app-1', 21]);
  });

  it('rejects a malformed cursor with INVALID_ARGUMENT', async () => {
    const { deps } = makeDeps();
    await expect(
      listApplications(deps, makePrincipal(), {
        limit: 20,
        statusFilter: S.APPLICATION_STATUS_UNSPECIFIED,
        cursor: 'not-a-valid-cursor!!!',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('emits a next_cursor when more rows exist', async () => {
    const { deps, query } = makeDeps();
    // limit 1 → fetch 2; two index rows means hasMore.
    query.mockResolvedValueOnce({
      rows: [
        { application_id: 'app-1', created_at: new Date('2026-06-02T12:00:00.000Z') },
        { application_id: 'app-0', created_at: new Date('2026-06-01T12:00:00.000Z') },
      ],
    });
    query.mockResolvedValue({ rows: aggregateRows() });

    const res = await listApplications(deps, makePrincipal(), {
      limit: 1,
      statusFilter: S.APPLICATION_STATUS_UNSPECIFIED,
    });

    expect(res.applications).toHaveLength(1);
    expect(res.nextCursor).toBeDefined();
  });

  it('offset mode returns a page plus a real total via COUNT(*) when page is set', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({
        rows: [{ application_id: 'app-1', created_at: new Date('2026-06-02T12:00:00.000Z') }],
      }) // the OFFSET page of index rows
      .mockResolvedValueOnce({ rows: [{ total: '42' }] }) // the COUNT(*)
      .mockResolvedValue({ rows: aggregateRows() }); // per-aggregate fold

    // page not in the pre-regen ListApplicationsRequest type yet — cast as
    // the existing tests cast the untyped shapes they build.
    const res = await listApplications(deps, makePrincipal({ userId: 'usr-1' }), {
      page: 2,
      limit: 20,
      statusFilter: S.APPLICATION_STATUS_UNSPECIFIED,
    } as never);

    expect(res.applications).toHaveLength(1);
    expect(res.applications[0].status).toBe(S.APPLICATION_STATUS_SUBMITTED);
    // Real total from the COUNT, and no keyset cursor in offset mode.
    expect(res.total).toBe(42);
    expect(res.nextCursor).toBeUndefined();

    // The page query uses OFFSET; a separate COUNT(*) produces the total.
    const pageSql = query.mock.calls[0][0] as string;
    expect(pageSql).toContain('OFFSET');
    expect(pageSql).not.toContain('application_id <'); // no cursor predicate
    const countSql = query.mock.calls[1][0] as string;
    expect(countSql).toContain('COUNT(*)');
    // Scope ($1 = own user id), then LIMIT + OFFSET = (page-1)*limit = 20.
    expect(query.mock.calls[0][1]).toEqual(['usr-1', 20, 20]);
    expect(query.mock.calls[1][1]).toEqual(['usr-1']);
  });

  // ADS-1165 — the gateway maps drafts to null and drops them from `data`,
  // so a COUNT that still includes drafts yields a total larger than the
  // rows returned, breaking totalPages / hasNext. Both the page query and
  // the COUNT must exclude drafts so total tracks what the caller receives.
  it('excludes drafts from the page query and the COUNT (ADS-1165)', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({
        rows: [{ application_id: 'app-1', created_at: new Date('2026-06-02T12:00:00.000Z') }],
      }) // OFFSET page of index rows (drafts already excluded by the query)
      .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // COUNT(*) over non-drafts
      .mockResolvedValue({ rows: aggregateRows() });

    const res = await listApplications(deps, makePrincipal({ userId: 'usr-1' }), {
      page: 1,
      limit: 20,
      statusFilter: S.APPLICATION_STATUS_UNSPECIFIED,
    } as never);

    const pageSql = query.mock.calls[0][0] as string;
    const countSql = query.mock.calls[1][0] as string;
    expect(pageSql).toContain("status <> 'draft'");
    expect(countSql).toContain("status <> 'draft'");
    expect(res.total).toBe(1);
  });

  it('offset mode scopes the COUNT to the caller, never widening visibility', async () => {
    const { deps, query } = makeDeps();
    query
      .mockResolvedValueOnce({ rows: [] }) // empty page
      .mockResolvedValueOnce({ rows: [{ total: '0' }] }); // COUNT(*)

    const res = await listApplications(
      deps,
      makePrincipal({ userId: 'staff-1', roles: ['rescue_staff'], rescueId: 'rsc-9' }),
      { page: 1, limit: 20, statusFilter: S.APPLICATION_STATUS_UNSPECIFIED } as never
    );

    expect(res.applications).toEqual([]);
    expect(res.total).toBe(0);
    // The COUNT is pinned to the staff member's own rescue.
    expect(query.mock.calls[1][1]).toContain('rsc-9');
  });
});
