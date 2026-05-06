import { vi, beforeEach, describe, it, expect } from 'vitest';

/**
 * ADS-105: Behavior tests for ReportsService.
 *
 * Focus is on the orchestration logic — dispatching widgets to
 * AnalyticsService, caching results, and authorizing view access.
 * Persistence calls go through mocked Sequelize models.
 */

vi.mock('../../models/SavedReport', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock('../../models/ReportTemplate', () => ({
  __esModule: true,
  default: { findAll: vi.fn() },
}));
vi.mock('../../models/ScheduledReport', () => ({
  __esModule: true,
  default: { findOne: vi.fn(), create: vi.fn(), findByPk: vi.fn() },
  ScheduledReportFormat: { PDF: 'pdf', CSV: 'csv', INLINE_HTML: 'inline-html' },
  ScheduledReportStatus: { PENDING: 'pending', SUCCESS: 'success', FAILED: 'failed' },
}));
vi.mock('../../models/ReportShare', () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
    findOrCreate: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
  },
  ReportShareType: { USER: 'user', TOKEN: 'token' },
  ReportSharePermission: { VIEW: 'view', EDIT: 'edit' },
}));

vi.mock('../../services/analytics.service', () => ({
  AnalyticsService: {
    getAdoptionMetrics: vi.fn(async () => ({ adoptionTrends: [{ date: '2026-01-01', count: 5 }] })),
    getApplicationMetrics: vi.fn(async () => ({ totals: { approved: 1 } })),
    getUserBehaviorMetrics: vi.fn(async () => ({ activeUsers: 10 })),
    getCommunicationMetrics: vi.fn(async () => ({ totalChats: 3 })),
    getPlatformMetrics: vi.fn(async () => ({ apiRequestCount: 100 })),
  },
}));

vi.mock('../../services/report-cache.service', () => ({
  ReportCache: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
    bust: vi.fn(async () => undefined),
  },
}));

import { ReportsService } from '../../services/reports.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ReportCache } from '../../services/report-cache.service';
import SavedReport from '../../models/SavedReport';
import ReportShare, {
  ReportShareType,
  ReportSharePermission,
} from '../../models/ReportShare';

const baseConfig = {
  filters: {},
  layout: { columns: 2 as const },
  widgets: [
    {
      id: '11111111-1111-4111-9111-111111111111',
      title: 'Adoptions',
      position: { x: 0, y: 0, w: 2, h: 2 },
      metric: 'adoption' as const,
      chartType: 'line' as const,
      options: {
        xKey: 'date',
        series: [{ key: 'count', label: 'Count' }],
      },
    },
  ],
};

describe('ReportsService.executeReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches widget metrics to AnalyticsService and returns merged payload', async () => {
    const result = await ReportsService.executeReport(baseConfig, { scope: 'platform' });
    expect(AnalyticsService.getAdoptionMetrics).toHaveBeenCalledOnce();
    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0].id).toBe(baseConfig.widgets[0].id);
    expect(result.cacheHit).toBe(false);
  });

  it('returns cached payload without calling AnalyticsService when cache is warm', async () => {
    (ReportCache.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      widgets: [],
      filters: {},
      computedAt: '2026-01-01T00:00:00Z',
      cacheHit: false,
    });
    const result = await ReportsService.executeReport(baseConfig, { scope: 'platform' });
    expect(AnalyticsService.getAdoptionMetrics).not.toHaveBeenCalled();
    expect(result.cacheHit).toBe(true);
  });

  it('passes the scope through as rescueId for rescue-scoped runs', async () => {
    await ReportsService.executeReport(baseConfig, { scope: 'rescue-uuid' });
    expect(AnalyticsService.getAdoptionMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ rescueId: 'rescue-uuid' })
    );
  });
});

describe('ReportsService.canView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeReport = (overrides: Partial<{ user_id: string; rescue_id: string | null }> = {}) =>
    ({
      saved_report_id: 'r1',
      user_id: 'owner-1',
      rescue_id: null,
      ...overrides,
    }) as InstanceType<typeof SavedReport>;

  it('lets the owner view their own report', async () => {
    const allowed = await ReportsService.canView(makeReport(), {
      userId: 'owner-1',
      rescueId: null,
      canReadPlatform: false,
      canReadRescue: false,
    });
    expect(allowed).toBe(true);
  });

  it('blocks a stranger from a platform-scope report without platform permission', async () => {
    (ReportShare.findOne as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const allowed = await ReportsService.canView(makeReport(), {
      userId: 'stranger',
      rescueId: null,
      canReadPlatform: false,
      canReadRescue: false,
    });
    expect(allowed).toBe(false);
  });

  it('lets platform readers see platform-scope reports (rescue_id IS NULL)', async () => {
    const allowed = await ReportsService.canView(makeReport(), {
      userId: 'admin-1',
      rescueId: null,
      canReadPlatform: true,
      canReadRescue: false,
    });
    expect(allowed).toBe(true);
  });

  it('blocks cross-rescue access to rescue-scoped reports', async () => {
    (ReportShare.findOne as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const allowed = await ReportsService.canView(
      makeReport({ rescue_id: 'rescue-A' }),
      {
        userId: 'staff-2',
        rescueId: 'rescue-B',
        canReadPlatform: false,
        canReadRescue: true,
      }
    );
    expect(allowed).toBe(false);
  });

  it('honors an active user share', async () => {
    const share = {
      isActive: () => true,
      revoked_at: null,
      expires_at: null,
      permission: ReportSharePermission.VIEW,
      share_type: ReportShareType.USER,
    };
    (ReportShare.findOne as ReturnType<typeof vi.fn>).mockResolvedValueOnce(share);
    const allowed = await ReportsService.canView(makeReport(), {
      userId: 'invited-user',
      rescueId: null,
      canReadPlatform: false,
      canReadRescue: false,
    });
    expect(allowed).toBe(true);
  });

  it('rejects expired or revoked shares', async () => {
    const share = { isActive: () => false };
    (ReportShare.findOne as ReturnType<typeof vi.fn>).mockResolvedValueOnce(share);
    const allowed = await ReportsService.canView(makeReport(), {
      userId: 'invited-user',
      rescueId: null,
      canReadPlatform: false,
      canReadRescue: false,
    });
    expect(allowed).toBe(false);
  });
});
