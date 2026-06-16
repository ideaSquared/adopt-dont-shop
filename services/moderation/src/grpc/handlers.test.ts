import { describe, expect, it, vi } from 'vitest';

import {
  ModerationV1,
  type AssignReportRequest,
  type FileReportRequest,
  type GetReportRequest,
  type ListReportsRequest,
  type ResolveReportRequest,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { encodeCursor } from './cursor.js';
import { assignReport, fileReport, getReport, listReports, resolveReport } from './handlers.js';

function makePrincipal(
  overrides: Partial<{ userId: string; permissions: string[]; roles: string[] }> = {}
) {
  return {
    userId: overrides.userId ?? 'usr-1',
    roles: overrides.roles ?? ['adopter'],
    permissions: overrides.permissions ?? ['moderation.reports.view', 'moderation.reports.manage'],
    rescueId: undefined,
  } as unknown as Parameters<typeof getReport>[1];
}

function makeDeps(steps: Array<unknown>): {
  deps: HandlerDeps;
  query: ReturnType<typeof vi.fn>;
} {
  const queryMock = vi.fn();
  for (const step of steps) {
    queryMock.mockResolvedValueOnce(step);
  }
  const pool = { query: queryMock } as unknown as HandlerDeps['pool'];
  const deps: HandlerDeps = { pool, nats: {} } as unknown as HandlerDeps;
  return { deps, query: queryMock };
}

// Patch withTransaction to a deterministic in-memory scope.
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

function reportRow(overrides: Record<string, unknown> = {}) {
  return {
    report_id: 'rpt-1',
    reporter_id: 'usr-1',
    reported_entity_type: 'user',
    reported_entity_id: 'usr-2',
    reported_user_id: 'usr-2',
    category: 'harassment',
    severity: 'high',
    status: 'pending',
    title: 'Abusive DMs',
    description: 'Threats sent.',
    metadata: {},
    assigned_moderator: null,
    assigned_at: null,
    resolved_by: null,
    resolved_at: null,
    resolution: null,
    resolution_notes: null,
    escalated_to: null,
    escalated_at: null,
    escalation_reason: null,
    created_at: new Date('2026-06-01T12:00:00.000Z'),
    updated_at: new Date('2026-06-01T12:00:00.000Z'),
    // (xmax = 0) AS was_inserted — true for a genuine insert. Defaults true
    // so the happy-path tests exercise the publish branch.
    was_inserted: true,
    ...overrides,
  };
}

const VALID_FILE_REQ: FileReportRequest = {
  reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_USER,
  reportedEntityId: 'usr-2',
  category: ModerationV1.ReportCategory.REPORT_CATEGORY_HARASSMENT,
  severity: ModerationV1.Severity.SEVERITY_HIGH,
  title: 'Abusive DMs',
  description: 'Threats sent.',
};

describe('fileReport', () => {
  it('does NOT require admin permission (any authenticated user can file)', async () => {
    const { deps } = makeDeps([{ rows: [reportRow()] }]);
    const res = await fileReport(deps, makePrincipal({ permissions: [] }), VALID_FILE_REQ);
    expect(res.report.reportId).toBe('rpt-1');
  });

  it.each([
    ['reportedEntityId', { ...VALID_FILE_REQ, reportedEntityId: '' }],
    ['title', { ...VALID_FILE_REQ, title: '' }],
    ['description', { ...VALID_FILE_REQ, description: '' }],
    [
      'reportedEntityType',
      {
        ...VALID_FILE_REQ,
        reportedEntityType: ModerationV1.ReportEntityType.REPORT_ENTITY_TYPE_UNSPECIFIED,
      },
    ],
    [
      'category',
      { ...VALID_FILE_REQ, category: ModerationV1.ReportCategory.REPORT_CATEGORY_UNSPECIFIED },
    ],
    ['severity', { ...VALID_FILE_REQ, severity: ModerationV1.Severity.SEVERITY_UNSPECIFIED }],
  ])('throws INVALID_ARGUMENT on missing %s', async (_field, req) => {
    const { deps } = makeDeps([]);
    await expect(fileReport(deps, makePrincipal(), req as FileReportRequest)).rejects.toMatchObject(
      {
        code: 'INVALID_ARGUMENT',
      }
    );
  });

  it('inserts a pending report + publishes moderation.reportFiled', async () => {
    const { deps } = makeDeps([{ rows: [reportRow()] }]);
    await fileReport(deps, makePrincipal(), VALID_FILE_REQ);
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'moderation.reportFiled' });
  });

  it('throws INVALID_ARGUMENT on malformed metadata_json', async () => {
    const { deps } = makeDeps([]);
    await expect(
      fileReport(deps, makePrincipal(), { ...VALID_FILE_REQ, metadataJson: 'not-json' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('uses ON CONFLICT so a re-delivered auto-report is idempotent (no duplicate row)', async () => {
    // The NATS subscribers re-file the SAME (reporter, entity_type, entity_id)
    // tuple when JetStream redelivers an event. The insert must collapse to a
    // no-op that returns the existing row rather than minting a duplicate.
    const { deps, query } = makeDeps([{ rows: [reportRow()] }]);
    await fileReport(deps, makePrincipal(), VALID_FILE_REQ);
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toMatch(/ON CONFLICT/i);
    expect(sql).toMatch(/reported_entity_type/);
    expect(sql).toMatch(/reported_entity_id/);
    // RETURNING must surface whether the row was freshly inserted so the
    // publish can be suppressed on the conflict path.
    expect(sql).toMatch(/xmax = 0/);
  });

  it('does NOT re-publish on a conflict no-op (redelivered system auto-report)', async () => {
    // ON CONFLICT DO UPDATE returns the pre-existing row with was_inserted=false.
    const { deps } = makeDeps([
      { rows: [reportRow({ report_id: 'existing-rpt', was_inserted: false })] },
    ]);
    const res = await fileReport(deps, makePrincipal(), VALID_FILE_REQ);
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    // No duplicate event for an already-announced report.
    expect(publish).not.toHaveBeenCalled();
    // The persisted (existing) id is returned, not the throwaway generated one.
    expect(res.report.reportId).toBe('existing-rpt');
  });

  it('publishes the event keyed by the persisted report_id', async () => {
    const { deps } = makeDeps([
      { rows: [reportRow({ report_id: 'persisted-rpt', was_inserted: true })] },
    ]);
    await fileReport(deps, makePrincipal(), VALID_FILE_REQ);
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({
      id: 'persisted-rpt',
      payload: { reportId: 'persisted-rpt' },
    });
  });
});

describe('getReport', () => {
  it('throws PERMISSION_DENIED without the reports-view permission for someone else’s report', async () => {
    const { deps } = makeDeps([{ rows: [reportRow({ reporter_id: 'someone-else' })] }]);
    await expect(
      getReport(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
        reportId: 'rpt-1',
      } as GetReportRequest)
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('allows a moderator with moderation.reports.view to read any report', async () => {
    const { deps } = makeDeps([{ rows: [reportRow({ reporter_id: 'someone-else' })] }]);
    const res = await getReport(
      deps,
      makePrincipal({ userId: 'mod-9', permissions: ['moderation.reports.view'] }),
      { reportId: 'rpt-1' } as GetReportRequest
    );
    expect(res.report.reportId).toBe('rpt-1');
  });

  it('allows a reporter to read their OWN report without any moderation permission', async () => {
    const { deps } = makeDeps([{ rows: [reportRow({ reporter_id: 'usr-1' })] }]);
    const res = await getReport(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
      reportId: 'rpt-1',
    } as GetReportRequest);
    expect(res.report.reportId).toBe('rpt-1');
  });

  it('strips internal moderation fields from the reporter self-read', async () => {
    const { deps } = makeDeps([
      {
        rows: [
          reportRow({
            reporter_id: 'usr-1',
            assigned_moderator: 'mod-7',
            assigned_at: new Date('2026-06-02T00:00:00.000Z'),
            resolved_by: 'mod-7',
            resolved_at: new Date('2026-06-03T00:00:00.000Z'),
            resolution: 'action_taken',
            resolution_notes: 'user suspended — internal',
            escalated_to: 'mod-8',
            escalated_at: new Date('2026-06-02T12:00:00.000Z'),
            escalation_reason: 'needs senior review',
          }),
        ],
      },
    ]);
    const res = await getReport(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
      reportId: 'rpt-1',
    } as GetReportRequest);
    // Internal workflow is hidden…
    expect(res.report.assignedModerator).toBeUndefined();
    expect(res.report.assignedAt).toBeUndefined();
    expect(res.report.resolvedBy).toBeUndefined();
    expect(res.report.resolutionNotes).toBeUndefined();
    expect(res.report.escalatedTo).toBeUndefined();
    expect(res.report.escalatedAt).toBeUndefined();
    expect(res.report.escalationReason).toBeUndefined();
    // …but the reporter still sees their report's status and outcome.
    expect(res.report.status).toBeDefined();
    expect(res.report.resolution).toBe('action_taken');
    expect(res.report.resolvedAt).toBe('2026-06-03T00:00:00.000Z');
  });

  it('returns full internal fields to a moderator with reports-view', async () => {
    const { deps } = makeDeps([
      {
        rows: [
          reportRow({
            reporter_id: 'someone-else',
            assigned_moderator: 'mod-7',
            resolution_notes: 'user suspended — internal',
          }),
        ],
      },
    ]);
    const res = await getReport(
      deps,
      makePrincipal({ userId: 'mod-9', permissions: ['moderation.reports.view'] }),
      { reportId: 'rpt-1' } as GetReportRequest
    );
    expect(res.report.assignedModerator).toBe('mod-7');
    expect(res.report.resolutionNotes).toBe('user suspended — internal');
  });

  it('strips transition moderator identity and reason for a reporter', async () => {
    const { deps } = makeDeps([
      { rows: [reportRow({ reporter_id: 'usr-1' })] },
      {
        rows: [
          {
            transition_id: 't-1',
            report_id: 'rpt-1',
            from_status: 'pending',
            to_status: 'resolved',
            transitioned_at: new Date('2026-06-03T00:00:00.000Z'),
            transitioned_by: 'mod-7',
            reason: 'handled internally',
          },
        ],
      },
    ]);
    const res = await getReport(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
      reportId: 'rpt-1',
      includeTransitions: true,
    });
    expect(res.transitions).toHaveLength(1);
    expect(res.transitions[0].toStatus).toBeDefined();
    expect(res.transitions[0].transitionedBy).toBeUndefined();
    expect(res.transitions[0].reason).toBeUndefined();
  });

  it('throws NOT_FOUND when the report does not exist', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(
      getReport(deps, makePrincipal(), { reportId: 'gone' } as GetReportRequest)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns the report without transitions by default', async () => {
    const { deps, query } = makeDeps([{ rows: [reportRow()] }]);
    const res = await getReport(deps, makePrincipal(), { reportId: 'rpt-1' } as GetReportRequest);
    expect(res.report.reportId).toBe('rpt-1');
    expect(res.transitions).toEqual([]);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('includes transitions when include_transitions is true', async () => {
    const { deps, query } = makeDeps([
      { rows: [reportRow()] },
      {
        rows: [
          {
            transition_id: 't-1',
            report_id: 'rpt-1',
            from_status: null,
            to_status: 'pending',
            transitioned_at: new Date('2026-06-01T12:00:00.000Z'),
            transitioned_by: null,
            reason: null,
          },
        ],
      },
    ]);
    const res = await getReport(deps, makePrincipal(), {
      reportId: 'rpt-1',
      includeTransitions: true,
    });
    expect(res.transitions).toHaveLength(1);
    expect(query).toHaveBeenCalledTimes(2);
  });
});

describe('listReports', () => {
  it('scopes a caller without moderation.reports.view to their OWN reports', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    await listReports(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
      limit: 10,
    } as ListReportsRequest);
    const sql = query.mock.calls[0][0] as string;
    const params = query.mock.calls[0][1] as unknown[];
    expect(sql).toContain('reporter_id = $1');
    expect(params[0]).toBe('usr-1');
  });

  it('strips internal moderation fields from a reporter-scoped list', async () => {
    const { deps } = makeDeps([
      {
        rows: [
          reportRow({
            reporter_id: 'usr-1',
            assigned_moderator: 'mod-7',
            resolution_notes: 'internal',
            escalation_reason: 'why',
          }),
        ],
      },
    ]);
    const res = await listReports(deps, makePrincipal({ userId: 'usr-1', permissions: [] }), {
      limit: 10,
    } as ListReportsRequest);
    expect(res.reports[0].assignedModerator).toBeUndefined();
    expect(res.reports[0].resolutionNotes).toBeUndefined();
    expect(res.reports[0].escalationReason).toBeUndefined();
  });

  it('does NOT scope a moderator with moderation.reports.view to their own reports', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    await listReports(
      deps,
      makePrincipal({ userId: 'mod-9', permissions: ['moderation.reports.view'] }),
      { limit: 10 } as ListReportsRequest
    );
    const sql = query.mock.calls[0][0] as string;
    expect(sql).not.toContain('reporter_id =');
  });

  it('applies status / severity / category / assigned filters', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    await listReports(deps, makePrincipal(), {
      status: ModerationV1.ReportStatus.REPORT_STATUS_PENDING,
      severity: ModerationV1.Severity.SEVERITY_HIGH,
      category: ModerationV1.ReportCategory.REPORT_CATEGORY_SPAM,
      assignedModerator: 'mod-1',
      limit: 10,
    } as ListReportsRequest);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('status = $1');
    expect(sql).toContain('severity = $2');
    expect(sql).toContain('category = $3');
    expect(sql).toContain('assigned_moderator = $4');
  });

  it('treats empty assignedModerator string as IS NULL filter', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    await listReports(deps, makePrincipal(), {
      assignedModerator: '',
    } as ListReportsRequest);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('assigned_moderator IS NULL');
  });

  it('emits nextCursor when more rows than limit', async () => {
    const eleven = Array.from({ length: 11 }, (_, i) =>
      reportRow({ report_id: `r-${i}`, created_at: new Date(2026, 5, 1, 12, 0, 0, i) })
    );
    const { deps } = makeDeps([{ rows: eleven }]);
    const res = await listReports(deps, makePrincipal(), { limit: 10 } as ListReportsRequest);
    expect(res.reports).toHaveLength(10);
    expect(res.nextCursor).toBeDefined();
  });

  it('throws INVALID_ARGUMENT on a malformed cursor', async () => {
    const { deps } = makeDeps([]);
    await expect(
      listReports(deps, makePrincipal(), { cursor: '!!!' } as ListReportsRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('decodes a valid cursor into the WHERE clause', async () => {
    const { deps, query } = makeDeps([{ rows: [] }]);
    const cursor = encodeCursor({ createdAt: '2026-06-01T12:00:00.000Z', id: 'r-x' });
    await listReports(deps, makePrincipal(), { cursor } as ListReportsRequest);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('created_at <');
    expect(sql).toContain('report_id <');
  });
});

describe('assignReport', () => {
  it('throws PERMISSION_DENIED without moderation.reports.manage', async () => {
    const { deps } = makeDeps([]);
    await expect(
      assignReport(deps, makePrincipal({ permissions: [] }), {
        reportId: 'rpt-1',
        moderatorId: 'mod-1',
      } as AssignReportRequest)
    ).rejects.toBeInstanceOf(HandlerError);
  });

  it('throws NOT_FOUND on a missing report', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(
      assignReport(deps, makePrincipal(), { reportId: 'gone', moderatorId: 'mod-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('updates assignment + inserts transition + publishes reportAssigned', async () => {
    const { deps } = makeDeps([
      { rows: [reportRow()] }, // SELECT FOR UPDATE
      { rows: [reportRow({ assigned_moderator: 'mod-1' })] }, // UPDATE RETURNING
      { rows: [] }, // INSERT transition
      { rows: [reportRow({ assigned_moderator: 'mod-1', status: 'under_review' })] }, // final SELECT
    ]);
    const res = await assignReport(deps, makePrincipal(), {
      reportId: 'rpt-1',
      moderatorId: 'mod-1',
    });
    expect(res.report.assignedModerator).toBe('mod-1');
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'moderation.reportAssigned' });
  });
});

describe('resolveReport', () => {
  it('throws INVALID_ARGUMENT on missing resolution', async () => {
    const { deps } = makeDeps([]);
    await expect(
      resolveReport(deps, makePrincipal(), {
        reportId: 'rpt-1',
        resolution: '',
      } as ResolveReportRequest)
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('throws NOT_FOUND on a missing report', async () => {
    const { deps } = makeDeps([{ rows: [] }]);
    await expect(
      resolveReport(deps, makePrincipal(), { reportId: 'gone', resolution: 'action_taken' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('writes resolution + transition + publishes reportResolved', async () => {
    const { deps } = makeDeps([
      { rows: [{ status: 'under_review' }] }, // SELECT status FOR UPDATE
      { rows: [] }, // UPDATE
      { rows: [] }, // INSERT transition
      { rows: [reportRow({ status: 'resolved', resolution: 'action_taken' })] }, // final SELECT
    ]);
    const res = await resolveReport(deps, makePrincipal(), {
      reportId: 'rpt-1',
      resolution: 'action_taken',
      resolutionNotes: 'User suspended.',
    });
    expect(res.report.status).toBe(ModerationV1.ReportStatus.REPORT_STATUS_RESOLVED);
    const publish = (deps as { _publish?: ReturnType<typeof vi.fn> })._publish!;
    expect(publish.mock.calls[0][0]).toMatchObject({ type: 'moderation.reportResolved' });
  });
});
