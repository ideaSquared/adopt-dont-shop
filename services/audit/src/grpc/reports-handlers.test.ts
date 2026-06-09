import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditV1 } from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import {
  createSavedReport,
  deleteSavedReport,
  getSavedReport,
  listReportTemplates,
  listSavedReports,
  updateSavedReport,
} from './reports-handlers.js';

function makePrincipal(over: { userId?: string; permissions?: string[] } = {}) {
  return {
    userId: over.userId ?? 'usr-1',
    roles: ['admin'],
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

  it('admin with :any updates any row', async () => {
    queryMock.mockResolvedValue({ rows: [makeRow({ name: 'New' })] });
    const res = await updateSavedReport(
      deps,
      makePrincipal({ permissions: ['reports.update', 'reports.read:any'] }),
      { savedReportId: 'rep-1', name: 'New' }
    );
    expect(res.report?.name).toBe('New');
    const sql = queryMock.mock.calls[0][0] as string;
    expect(sql).not.toContain('user_id = $');
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
