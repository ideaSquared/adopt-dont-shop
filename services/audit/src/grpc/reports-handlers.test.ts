import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditV1 } from '@adopt-dont-shop/proto';

import { type HandlerDeps } from './adapter.js';
import {
  createReportShare,
  createSavedReport,
  deleteSavedReport,
  getSavedReport,
  listReportTemplates,
  listSavedReports,
  updateSavedReport,
  upsertReportSchedule,
} from './reports-handlers.js';

function makePrincipal(over: { userId?: string; roles?: string[]; permissions?: string[] } = {}) {
  return {
    userId: over.userId ?? 'usr-1',
    roles: over.roles ?? ['admin'],
    permissions: over.permissions ?? ['reports.read'],
    rescueId: undefined,
  } as unknown as Parameters<typeof listSavedReports>[1];
}

function makeRow(over: Record<string, unknown> = {}) {
  return {
    saved_report_id: 'rep-1',
    user_id: 'usr-1',
    rescue_id: null,
    template_id: null,
    name: 'My Report',
    description: null,
    config: { widgets: [] },
    is_archived: false,
    created_at: new Date('2026-06-01T00:00:00Z'),
    updated_at: new Date('2026-06-01T00:00:00Z'),
    ...over,
  };
}

function makeDeps(queryImpl?: ReturnType<typeof vi.fn>) {
  const q = queryImpl ?? vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  return {
    deps: { pool: { query: q }, nats: {} } as unknown as HandlerDeps,
    queryMock: q,
  };
}

describe('listSavedReports', () => {
  it('rejects callers without reports.read', async () => {
    const { deps } = makeDeps();
    await expect(
      listSavedReports(deps, makePrincipal({ permissions: [] }), { page: 1, limit: 20 })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('self-scopes to user_id when caller lacks :any', async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const { deps } = makeDeps(q);
    await listSavedReports(deps, makePrincipal({ permissions: ['reports.read'] }), {
      page: 1,
      limit: 20,
    });
    const [countSql, countParams] = q.mock.calls[0] as [string, unknown[]];
    expect(countSql).toContain('user_id = $1');
    expect(countParams[0]).toBe('usr-1');
  });

  it('returns all rows for callers with reports.read:any', async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const { deps } = makeDeps(q);
    await listSavedReports(deps, makePrincipal({ permissions: ['reports.read:any'] }), {
      page: 1,
      limit: 20,
    });
    const [countSql] = q.mock.calls[0] as [string, unknown[]];
    expect(countSql).not.toContain('user_id = $');
  });

  it('paginates: returns total + page + totalPages', async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '47' }] })
      .mockResolvedValueOnce({ rows: [makeRow()] });
    const { deps } = makeDeps(q);
    const res = await listSavedReports(deps, makePrincipal({ permissions: ['reports.read:any'] }), {
      page: 2,
      limit: 20,
    });
    expect(res.total).toBe(47);
    expect(res.page).toBe(2);
    expect(res.totalPages).toBe(3);
  });
});

describe('getSavedReport', () => {
  it('returns NOT_FOUND when the row is missing', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [] });
    const { deps } = makeDeps(q);
    await expect(
      getSavedReport(deps, makePrincipal(), { savedReportId: 'rep-x' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('hides foreign rows behind NOT_FOUND when caller lacks :any', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [makeRow({ user_id: 'usr-2' })] });
    const { deps } = makeDeps(q);
    await expect(
      getSavedReport(deps, makePrincipal(), { savedReportId: 'rep-1' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('admin with :any can read foreign rows', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [makeRow({ user_id: 'usr-2' })] });
    const { deps } = makeDeps(q);
    const res = await getSavedReport(deps, makePrincipal({ permissions: ['reports.read:any'] }), {
      savedReportId: 'rep-1',
    });
    expect(res.report?.userId).toBe('usr-2');
  });

  it('parses config back into JSON-stringified blob on the wire', async () => {
    const q = vi
      .fn()
      .mockResolvedValue({ rows: [makeRow({ config: { metrics: ['adoptions_total'] } })] });
    const { deps } = makeDeps(q);
    const res = await getSavedReport(deps, makePrincipal(), { savedReportId: 'rep-1' });
    expect(res.report?.configJson).toBe('{"metrics":["adoptions_total"]}');
  });
});

describe('createSavedReport', () => {
  it('rejects without reports.create', async () => {
    const { deps } = makeDeps();
    await expect(
      createSavedReport(deps, makePrincipal(), {
        name: 'X',
        configJson: '{"widgets":[]}',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('requires a non-empty name', async () => {
    const { deps } = makeDeps();
    await expect(
      createSavedReport(deps, makePrincipal({ permissions: ['reports.create'] }), {
        name: '   ',
        configJson: '{}',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('rejects invalid JSON config with INVALID_ARGUMENT', async () => {
    const { deps } = makeDeps();
    await expect(
      createSavedReport(deps, makePrincipal({ permissions: ['reports.create'] }), {
        name: 'X',
        configJson: 'not json',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('inserts and returns the row stamped with the principal user_id', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [makeRow()] });
    const { deps } = makeDeps(q);
    const res = await createSavedReport(deps, makePrincipal({ permissions: ['reports.create'] }), {
      name: 'My Report',
      configJson: '{"widgets":[]}',
    });
    expect(res.report?.savedReportId).toBe('rep-1');
    const params = q.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe('usr-1'); // user_id
    expect(params[3]).toBe('My Report');
  });

  it('rejects a non-existent template_id with INVALID_ARGUMENT (ADS-785)', async () => {
    // Existence check returns no row → the template doesn't exist.
    const q = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const { deps } = makeDeps(q);
    await expect(
      createSavedReport(deps, makePrincipal({ permissions: ['reports.create'] }), {
        name: 'My Report',
        configJson: '{"widgets":[]}',
        templateId: 'missing-template',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    // The orphan check runs before the INSERT — no row was written.
    const sqls = q.mock.calls.map(c => String(c[0]));
    expect(sqls.some(s => s.includes('INSERT INTO saved_reports'))).toBe(false);
  });

  it('inserts when the referenced template exists', async () => {
    const q = vi
      .fn()
      // Existence check finds the template …
      .mockResolvedValueOnce({ rows: [{ template_id: 't-1' }], rowCount: 1 })
      // … then the INSERT returns the new row.
      .mockResolvedValueOnce({ rows: [makeRow({ template_id: 't-1' })], rowCount: 1 });
    const { deps } = makeDeps(q);
    const res = await createSavedReport(deps, makePrincipal({ permissions: ['reports.create'] }), {
      name: 'My Report',
      configJson: '{"widgets":[]}',
      templateId: 't-1',
    });
    expect(res.report?.templateId).toBe('t-1');
    const insertParams = q.mock.calls[1][1] as unknown[];
    expect(insertParams[2]).toBe('t-1'); // template_id passed through
  });
});

describe('updateSavedReport', () => {
  let deps: HandlerDeps;
  let queryMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    const m = makeDeps();
    deps = m.deps;
    queryMock = m.queryMock;
  });

  it('rejects without reports.update', async () => {
    await expect(
      updateSavedReport(deps, makePrincipal(), {
        savedReportId: 'rep-1',
        name: 'New',
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('refuses to UPDATE a foreign row when caller lacks :any (no rows returned)', async () => {
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 });
    await expect(
      updateSavedReport(deps, makePrincipal({ permissions: ['reports.update'] }), {
        savedReportId: 'rep-1',
        name: 'New',
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toContain('user_id = $');
  });

  it('admin with reports.update:any updates any row', async () => {
    queryMock.mockResolvedValue({ rows: [makeRow({ name: 'New' })] });
    const res = await updateSavedReport(
      deps,
      makePrincipal({ permissions: ['reports.update', 'reports.update:any'] }),
      { savedReportId: 'rep-1', name: 'New' }
    );
    expect(res.report?.name).toBe('New');
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).not.toContain('user_id = $');
  });

  it('reports.read:any alone does NOT broaden write scoping (regression)', async () => {
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 });
    await expect(
      updateSavedReport(
        deps,
        makePrincipal({ permissions: ['reports.update', 'reports.read:any'] }),
        { savedReportId: 'rep-1', name: 'New' }
      )
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).toContain('user_id = $');
  });

  it('validates JSON config when configJson is sent', async () => {
    await expect(
      updateSavedReport(deps, makePrincipal({ permissions: ['reports.update'] }), {
        savedReportId: 'rep-1',
        configJson: 'not json',
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
});

describe('deleteSavedReport', () => {
  it('rejects without reports.delete', async () => {
    const { deps } = makeDeps();
    await expect(
      deleteSavedReport(deps, makePrincipal(), { savedReportId: 'rep-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('soft-deletes (sets deleted_at)', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [{ saved_report_id: 'rep-1' }], rowCount: 1 });
    const { deps } = makeDeps(q);
    const res = await deleteSavedReport(deps, makePrincipal({ permissions: ['reports.delete'] }), {
      savedReportId: 'rep-1',
    });
    expect(res.deleted).toBe(true);
    const sql = q.mock.calls[0][0] as string;
    expect(sql).toContain('SET deleted_at = now()');
  });

  it('returns deleted=false when the row was already gone', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const { deps } = makeDeps(q);
    const res = await deleteSavedReport(deps, makePrincipal({ permissions: ['reports.delete'] }), {
      savedReportId: 'rep-x',
    });
    expect(res.deleted).toBe(false);
  });

  it('scopes WHERE to user_id when caller has reports.delete but not reports.delete:any', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const { deps } = makeDeps(q);
    await deleteSavedReport(deps, makePrincipal({ permissions: ['reports.delete'] }), {
      savedReportId: 'rep-1',
    });
    const sql = q.mock.calls[0][0] as string;
    expect(sql).toContain('user_id = $');
  });

  it('admin with reports.delete:any deletes any row without user_id scope', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [{ saved_report_id: 'rep-1' }], rowCount: 1 });
    const { deps } = makeDeps(q);
    const res = await deleteSavedReport(
      deps,
      makePrincipal({ permissions: ['reports.delete', 'reports.delete:any'] }),
      { savedReportId: 'rep-1' }
    );
    expect(res.deleted).toBe(true);
    const sql = q.mock.calls[0][0] as string;
    expect(sql).not.toContain('user_id = $');
  });

  it('reports.read:any alone does NOT broaden delete scoping (regression)', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const { deps } = makeDeps(q);
    await deleteSavedReport(
      deps,
      makePrincipal({ permissions: ['reports.delete', 'reports.read:any'] }),
      { savedReportId: 'rep-1' }
    );
    const sql = q.mock.calls[0][0] as string;
    expect(sql).toContain('user_id = $');
  });
});

describe('super_admin role grant', () => {
  // super_admin is a platform-wide superuser whose grant is on the role,
  // not the permissions array. requirePermission honours it everywhere
  // else in the service; these handlers must too.
  function superAdmin(userId = 'usr-9') {
    return makePrincipal({ userId, roles: ['super_admin'], permissions: [] });
  }

  it('reaches reads with no explicit reports.read permission', async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const { deps } = makeDeps(q);
    await expect(
      listSavedReports(deps, superAdmin(), { page: 1, limit: 20 })
    ).resolves.toBeDefined();
  });

  it('reaches creates with no explicit reports.create permission', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [makeRow()] });
    const { deps } = makeDeps(q);
    await expect(
      createSavedReport(deps, superAdmin(), { name: 'X', configJson: '{"widgets":[]}' })
    ).resolves.toBeDefined();
  });

  it('updates any row (treated as :any) with no explicit permission', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [makeRow({ name: 'New' })] });
    const { deps } = makeDeps(q);
    await updateSavedReport(deps, superAdmin(), { savedReportId: 'rep-1', name: 'New' });
    const sql = q.mock.calls[0][0] as string;
    expect(sql).not.toContain('user_id = $');
  });
});

describe('listReportTemplates', () => {
  it('requires reports.read', async () => {
    const { deps } = makeDeps();
    await expect(
      listReportTemplates(deps, makePrincipal({ permissions: [] }), { category: 0 })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('filters by category', async () => {
    const q = vi.fn().mockResolvedValue({
      rows: [
        {
          template_id: 't-1',
          name: 'T',
          description: null,
          category: 'adoption',
          config: {},
          is_system: true,
          rescue_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    });
    const { deps } = makeDeps(q);
    const res = await listReportTemplates(deps, makePrincipal(), {
      category: AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ADOPTION,
    });
    expect(res.templates).toHaveLength(1);
    expect(res.templates[0].category).toBe(
      AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ADOPTION
    );
    const params = q.mock.calls[0][1] as unknown[];
    expect(params).toContain('adoption');
  });

  it('includes system + rescue-scoped when rescueId is provided', async () => {
    const q = vi.fn().mockResolvedValue({ rows: [] });
    const { deps } = makeDeps(q);
    await listReportTemplates(deps, makePrincipal(), { category: 0, rescueId: 'rescue-1' });
    const sql = q.mock.calls[0][0] as string;
    expect(sql).toContain('rescue_id = $');
    expect(sql).toContain('OR rescue_id IS NULL');
  });
});

function makeScheduleRow(over: Record<string, unknown> = {}) {
  return {
    schedule_id: 'sched-1',
    saved_report_id: 'rep-1',
    cron: '0 9 * * 1',
    timezone: 'UTC',
    recipients: [{ email: 'a@b.com' }],
    format: 'pdf',
    is_enabled: true,
    last_run_at: null,
    next_run_at: null,
    last_status: null,
    last_error: null,
    created_at: new Date('2026-06-01T00:00:00Z'),
    updated_at: new Date('2026-06-01T00:00:00Z'),
    ...over,
  };
}

describe('upsertReportSchedule', () => {
  it('rejects without reports.update', async () => {
    const { deps } = makeDeps();
    await expect(
      upsertReportSchedule(deps, makePrincipal({ permissions: [] }), {
        savedReportId: 'rep-1',
        cron: '0 9 * * 1',
        recipients: [],
        format: AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('requires a non-empty cron', async () => {
    const { deps } = makeDeps();
    await expect(
      upsertReportSchedule(deps, makePrincipal({ permissions: ['reports.update'] }), {
        savedReportId: 'rep-1',
        cron: '   ',
        recipients: [],
        format: AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF,
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('hides foreign saved reports behind NOT_FOUND when caller lacks reports.update:any', async () => {
    const q = vi.fn().mockResolvedValueOnce({ rows: [{ user_id: 'usr-2' }] });
    const { deps } = makeDeps(q);
    await expect(
      upsertReportSchedule(deps, makePrincipal({ permissions: ['reports.update'] }), {
        savedReportId: 'rep-1',
        cron: '0 9 * * 1',
        recipients: [],
        format: AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF,
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('upserts the schedule and returns the row keyed on saved_report_id', async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-1' }] })
      .mockResolvedValueOnce({ rows: [makeScheduleRow()] });
    const { deps } = makeDeps(q);
    const res = await upsertReportSchedule(
      deps,
      makePrincipal({ permissions: ['reports.update'] }),
      {
        savedReportId: 'rep-1',
        cron: '0 9 * * 1',
        recipients: [{ email: 'a@b.com' }],
        format: AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF,
      }
    );
    expect(res.schedule?.scheduleId).toBe('sched-1');
    expect(res.schedule?.format).toBe(AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF);
    const [sql, params] = q.mock.calls[1] as [string, unknown[]];
    expect(sql).toContain('ON CONFLICT (saved_report_id) DO UPDATE');
    expect(params[0]).toBe('rep-1');
  });

  it('defaults timezone to UTC when omitted', async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-1' }] })
      .mockResolvedValueOnce({ rows: [makeScheduleRow()] });
    const { deps } = makeDeps(q);
    await upsertReportSchedule(deps, makePrincipal({ permissions: ['reports.update'] }), {
      savedReportId: 'rep-1',
      cron: '0 9 * * 1',
      recipients: [],
      format: AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF,
    });
    const params = q.mock.calls[1][1] as unknown[];
    expect(params[2]).toBe('UTC');
  });

  it("admin with reports.update:any can upsert another user's schedule", async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-2' }] })
      .mockResolvedValueOnce({ rows: [makeScheduleRow()] });
    const { deps } = makeDeps(q);
    await expect(
      upsertReportSchedule(
        deps,
        makePrincipal({ permissions: ['reports.update', 'reports.update:any'] }),
        {
          savedReportId: 'rep-1',
          cron: '0 9 * * 1',
          recipients: [],
          format: AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF,
        }
      )
    ).resolves.toBeDefined();
  });
});

function makeShareRow(over: Record<string, unknown> = {}) {
  return {
    share_id: 'share-1',
    saved_report_id: 'rep-1',
    share_type: 'token',
    permission: 'view',
    expires_at: null,
    revoked_at: null,
    created_at: new Date('2026-06-01T00:00:00Z'),
    ...over,
  };
}

describe('createReportShare', () => {
  it('rejects without reports.update', async () => {
    const { deps } = makeDeps();
    await expect(
      createReportShare(deps, makePrincipal({ permissions: [] }), {
        savedReportId: 'rep-1',
        permission: AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_VIEW,
      })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  });

  it('hides foreign saved reports behind NOT_FOUND when caller lacks reports.update:any', async () => {
    const q = vi.fn().mockResolvedValueOnce({ rows: [{ user_id: 'usr-2' }] });
    const { deps } = makeDeps(q);
    await expect(
      createReportShare(deps, makePrincipal({ permissions: ['reports.update'] }), {
        savedReportId: 'rep-1',
        permission: AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_VIEW,
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns the plaintext token only in the response, persisting just its hash', async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-1' }] })
      .mockResolvedValueOnce({ rows: [makeShareRow()] });
    const { deps } = makeDeps(q);
    const res = await createReportShare(deps, makePrincipal({ permissions: ['reports.update'] }), {
      savedReportId: 'rep-1',
      permission: AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_VIEW,
    });
    expect(res.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(res.share?.shareId).toBe('share-1');
    const insertParams = q.mock.calls[1][1] as unknown[];
    expect(insertParams[1]).toBe('view');
    expect(insertParams[2]).not.toBe(res.token); // stored value is the hash, not the plaintext
  });

  it('passes the EDIT permission through to the insert', async () => {
    const q = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ user_id: 'usr-1' }] })
      .mockResolvedValueOnce({ rows: [makeShareRow({ permission: 'edit' })] });
    const { deps } = makeDeps(q);
    const res = await createReportShare(deps, makePrincipal({ permissions: ['reports.update'] }), {
      savedReportId: 'rep-1',
      permission: AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_EDIT,
    });
    expect(res.share?.permission).toBe(AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_EDIT);
  });
});
