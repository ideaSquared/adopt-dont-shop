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
    permissions: overrides.permissions ?? ['admin.dashboard'],
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
});

describe('getReport', () => {
  it('throws PERMISSION_DENIED without admin.dashboard', async () => {
    const { deps } = makeDeps([]);
    await expect(
      getReport(deps, makePrincipal({ permissions: [] }), { reportId: 'rpt-1' } as GetReportRequest)
    ).rejects.toBeInstanceOf(HandlerError);
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
  it('throws PERMISSION_DENIED without admin.dashboard', async () => {
    const { deps } = makeDeps([]);
    await expect(
      listReports(deps, makePrincipal({ permissions: [] }), {} as ListReportsRequest)
    ).rejects.toBeInstanceOf(HandlerError);
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
  it('throws PERMISSION_DENIED without admin.dashboard', async () => {
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
