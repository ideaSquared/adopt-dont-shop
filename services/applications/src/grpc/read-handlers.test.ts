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
});
