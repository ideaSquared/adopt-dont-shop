import { ReportService } from '../report-service';
import type { ApiService } from '@adopt-dont-shop/lib.api';
import type { ReportConfig } from '../../schemas/reports';

// Mock lib.api — matches the shape used by analytics-service.test.ts so the
// default `new ApiService()` constructor in ReportService is also stubbed.
vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiService: vi.fn().mockImplementation(function () {
    return {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
  }),
}));

// A minimal valid ReportConfig that satisfies reportConfigSchema.
const validConfig: ReportConfig = {
  filters: { groupBy: 'day' },
  layout: { columns: 2 },
  widgets: [
    {
      id: '634d3ff9-634a-40e8-8ef5-efd55e37d4b1',
      title: 'Adoptions over time',
      position: { x: 0, y: 0, w: 6, h: 4 },
      metric: 'adoption',
      chartType: 'line',
      options: {
        xKey: 'date',
        series: [{ key: 'count', label: 'Count' }],
      },
    },
  ],
};

const savedReport = {
  saved_report_id: '589d55e5-2e80-40d8-84d7-1784f351abdf',
  user_id: '53675d26-0427-4dba-a837-cabde1605f76',
  rescue_id: null,
  template_id: null,
  name: 'My report',
  description: null,
  config: validConfig,
  is_archived: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const executedReport = {
  widgets: [
    {
      id: '634d3ff9-634a-40e8-8ef5-efd55e37d4b1',
      data: [{ date: '2026-01-01', count: 3 }],
      meta: { metric: 'adoption', chartType: 'line', computedAt: '2026-01-01T00:00:00.000Z' },
    },
  ],
  filters: { groupBy: 'day' },
  computedAt: '2026-01-01T00:00:00.000Z',
  cacheHit: false,
};

type MockedApi = {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('ReportService', () => {
  let api: MockedApi;
  let service: ReportService;

  beforeEach(() => {
    vi.clearAllMocks();
    api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
    // The ApiService param is typed; the mock only implements the methods used.
    service = new ReportService(api as unknown as ApiService);
  });

  describe('list', () => {
    it('fetches saved reports from the list endpoint and validates them', async () => {
      api.get.mockResolvedValue({ data: [savedReport], success: true });

      const result = await service.list();

      expect(api.get).toHaveBeenCalledWith('/api/v1/reports');
      expect(result).toHaveLength(1);
      expect(result[0].saved_report_id).toBe(savedReport.saved_report_id);
    });

    it('appends includeArchived=true to the query when requested', async () => {
      api.get.mockResolvedValue({ data: [] });

      await service.list(true);

      expect(api.get).toHaveBeenCalledWith('/api/v1/reports?includeArchived=true');
    });

    it('unwraps a bare array response without a data envelope', async () => {
      api.get.mockResolvedValue([savedReport]);

      const result = await service.list();

      expect(result).toHaveLength(1);
    });

    it('rejects when the response does not match the saved-report schema', async () => {
      api.get.mockResolvedValue({ data: [{ saved_report_id: 'not-a-uuid' }] });

      await expect(service.list()).rejects.toThrow();
    });

    it('propagates API failures', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      await expect(service.list()).rejects.toThrow('Network error');
    });
  });

  describe('get', () => {
    it('fetches a single report by id', async () => {
      api.get.mockResolvedValue({ data: savedReport });

      const result = await service.get(savedReport.saved_report_id);

      expect(api.get).toHaveBeenCalledWith(`/api/v1/reports/${savedReport.saved_report_id}`);
      expect(result.name).toBe('My report');
    });
  });

  describe('create', () => {
    it('posts the report body and returns the validated saved report', async () => {
      api.post.mockResolvedValue({ data: savedReport });
      const body = { name: 'My report', config: validConfig };

      const result = await service.create(body);

      expect(api.post).toHaveBeenCalledWith('/api/v1/reports', body);
      expect(result.saved_report_id).toBe(savedReport.saved_report_id);
    });
  });

  describe('update', () => {
    it('puts the patch to the report id endpoint', async () => {
      api.put.mockResolvedValue({ data: { ...savedReport, name: 'Renamed' } });

      const result = await service.update(savedReport.saved_report_id, { name: 'Renamed' });

      expect(api.put).toHaveBeenCalledWith(`/api/v1/reports/${savedReport.saved_report_id}`, {
        name: 'Renamed',
      });
      expect(result.name).toBe('Renamed');
    });
  });

  describe('remove', () => {
    it('deletes the report by id', async () => {
      api.delete.mockResolvedValue(undefined);

      await service.remove(savedReport.saved_report_id);

      expect(api.delete).toHaveBeenCalledWith(`/api/v1/reports/${savedReport.saved_report_id}`);
    });
  });

  describe('executeSaved', () => {
    it('posts to the execute endpoint and validates the executed report', async () => {
      api.post.mockResolvedValue({ data: executedReport });

      const result = await service.executeSaved(savedReport.saved_report_id);

      expect(api.post).toHaveBeenCalledWith(
        `/api/v1/reports/${savedReport.saved_report_id}/execute`
      );
      expect(result.cacheHit).toBe(false);
      expect(result.widgets).toHaveLength(1);
    });
  });

  describe('executePreview', () => {
    it('posts the config to the preview execute endpoint', async () => {
      api.post.mockResolvedValue({ data: executedReport });

      const result = await service.executePreview(validConfig);

      expect(api.post).toHaveBeenCalledWith('/api/v1/reports/execute', { config: validConfig });
      expect(result.computedAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('listTemplates', () => {
    it('fetches and validates report templates', async () => {
      const template = {
        template_id: 'a815dd73-7217-4066-9829-9341e80a6513',
        name: 'Adoption funnel',
        description: null,
        category: 'adoption',
        config: validConfig,
        is_system: true,
        rescue_id: null,
      };
      api.get.mockResolvedValue({ data: [template] });

      const result = await service.listTemplates();

      expect(api.get).toHaveBeenCalledWith('/api/v1/reports/templates');
      expect(result[0].category).toBe('adoption');
    });
  });

  describe('upsertSchedule', () => {
    it('posts the schedule body to the schedule endpoint and validates it', async () => {
      const schedule = {
        schedule_id: 'c786db74-eb4f-4c2b-82ad-7d44a435f469',
        saved_report_id: savedReport.saved_report_id,
        cron: '0 9 * * 1',
        timezone: 'UTC',
        recipients: [{ email: 'owner@example.com' }],
        format: 'pdf',
        is_enabled: true,
        last_run_at: null,
        next_run_at: null,
        last_status: null,
        last_error: null,
      };
      api.post.mockResolvedValue({ data: schedule });
      const body = { cron: '0 9 * * 1', recipients: [{ email: 'owner@example.com' }] };

      const result = await service.upsertSchedule(savedReport.saved_report_id, body);

      expect(api.post).toHaveBeenCalledWith(
        `/api/v1/reports/${savedReport.saved_report_id}/schedule`,
        body
      );
      expect(result.cron).toBe('0 9 * * 1');
    });
  });

  describe('deleteSchedule', () => {
    it('deletes a schedule by id', async () => {
      api.delete.mockResolvedValue(undefined);

      await service.deleteSchedule('c786db74-eb4f-4c2b-82ad-7d44a435f469');

      expect(api.delete).toHaveBeenCalledWith(
        '/api/v1/reports/schedules/c786db74-eb4f-4c2b-82ad-7d44a435f469'
      );
    });
  });

  describe('createUserShare', () => {
    it('posts a user share with shareType=user and returns the unwrapped share', async () => {
      api.post.mockResolvedValue({ data: { share: { share_id: 'share-1' } } });

      const result = await service.createUserShare(savedReport.saved_report_id, {
        sharedWithUserId: 'a97031e0-57fd-4ec7-b9a3-20cd60482869',
        permission: 'edit',
      });

      expect(api.post).toHaveBeenCalledWith(
        `/api/v1/reports/${savedReport.saved_report_id}/share`,
        {
          shareType: 'user',
          sharedWithUserId: 'a97031e0-57fd-4ec7-b9a3-20cd60482869',
          permission: 'edit',
        }
      );
      expect(result.share.share_id).toBe('share-1');
    });
  });

  describe('createTokenShare', () => {
    it('posts a token share with the expiry serialised to ISO', async () => {
      api.post.mockResolvedValue({ data: { share: { share_id: 'share-2' }, token: 'tok-abc' } });
      const expiresAt = new Date('2026-02-01T00:00:00.000Z');

      const result = await service.createTokenShare(savedReport.saved_report_id, { expiresAt });

      expect(api.post).toHaveBeenCalledWith(
        `/api/v1/reports/${savedReport.saved_report_id}/share`,
        {
          shareType: 'token',
          permission: 'view',
          expiresAt: '2026-02-01T00:00:00.000Z',
        }
      );
      expect(result.token).toBe('tok-abc');
    });
  });

  describe('revokeShare', () => {
    it('deletes a share by id', async () => {
      api.delete.mockResolvedValue(undefined);

      await service.revokeShare('share-3');

      expect(api.delete).toHaveBeenCalledWith('/api/v1/reports/shares/share-3');
    });
  });

  describe('viewSharedByToken', () => {
    it('fetches a shared report by token and returns the unwrapped payload', async () => {
      const payload = {
        report: { name: 'Shared', description: null, config: validConfig },
        data: executedReport,
      };
      api.get.mockResolvedValue({ data: payload });

      const result = await service.viewSharedByToken('tok-xyz');

      expect(api.get).toHaveBeenCalledWith('/api/v1/reports/shared/tok-xyz');
      expect(result.report.name).toBe('Shared');
      expect(result.data.cacheHit).toBe(false);
    });
  });

  describe('default constructor', () => {
    it('builds its own ApiService when none is provided', () => {
      // Exercises the `api ?? new ApiService()` branch.
      expect(() => new ReportService()).not.toThrow();
    });
  });
});
