import { ModerationService } from './moderation-service';
import { apiService } from '@adopt-dont-shop/lib.api';

vi.mock('@adopt-dont-shop/lib.api');

const mockedApi = apiService as vi.Mocked<typeof apiService>;

const validReport = {
  reportId: 'rep_1',
  reporterId: 'user_1',
  reportedEntityType: 'user',
  reportedEntityId: 'user_2',
  category: 'harassment',
  severity: 'high',
  status: 'pending',
  title: 'Inappropriate behaviour',
  description: 'A long enough description so the schema accepts it.',
  evidence: [],
  createdAt: '2026-04-21T00:00:00Z',
  updatedAt: '2026-04-21T00:00:00Z',
};

const validAction = {
  actionId: 'act_1',
  moderatorId: 'mod_1',
  targetEntityType: 'user',
  targetEntityId: 'user_2',
  actionType: 'user_banned',
  severity: 'high',
  reason: 'Repeated abuse',
  evidence: [],
  createdAt: '2026-04-21T00:00:00Z',
  updatedAt: '2026-04-21T00:00:00Z',
};

const validMetrics = {
  totalReports: 5,
  pendingReports: 2,
  underReviewReports: 1,
  resolvedReports: 1,
  dismissedReports: 1,
  escalatedReports: 0,
  criticalReports: 1,
  averageResolutionTime: 4.5,
  reportsToday: 1,
  reportsThisWeek: 3,
  reportsThisMonth: 5,
  topCategories: [{ category: 'harassment', count: 3 }],
  moderatorActivity: [{ moderatorId: 'mod_1', actionsCount: 4, resolvedCount: 2 }],
};

describe('ModerationService', () => {
  let service: ModerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ModerationService();
  });

  describe('getReports', () => {
    it('issues a GET against the reports endpoint', async () => {
      mockedApi.get.mockResolvedValueOnce({
        success: true,
        data: [validReport],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const result = await service.getReports();
      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/admin/moderation/reports');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.reportId).toBe('rep_1');
    });

    it('appends a query string when filters are provided', async () => {
      mockedApi.get.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await service.getReports({ status: 'pending', page: 2 } as never);
      const calledWith = mockedApi.get.mock.calls[0]?.[0] as string;
      expect(calledWith).toContain('/api/v1/admin/moderation/reports?');
      expect(calledWith).toContain('status=pending');
      expect(calledWith).toContain('page=2');
    });

    it('rejects when the backend payload fails schema validation', async () => {
      mockedApi.get.mockResolvedValueOnce({
        success: true,
        data: [{ reportId: 1 }],
        pagination: {},
      });

      await expect(service.getReports()).rejects.toBeDefined();
    });
  });

  describe('bulkUpdateReports', () => {
    it('parses and returns the bulk update response', async () => {
      mockedApi.post.mockResolvedValueOnce({ success: true, updated: 3 });

      const result = await service.bulkUpdateReports({
        reportIds: ['rep_1', 'rep_2', 'rep_3'],
        action: 'resolve',
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports/bulk-update',
        expect.objectContaining({ action: 'resolve' })
      );
      expect(result).toEqual({ success: true, updated: 3 });
    });

    it('rejects when the bulk update response fails schema validation', async () => {
      mockedApi.post.mockResolvedValueOnce({ success: 'yes', updated: 'three' });

      await expect(
        service.bulkUpdateReports({ reportIds: ['rep_1'], action: 'dismiss' })
      ).rejects.toBeDefined();
    });
  });

  describe('createReport', () => {
    it('POSTs the body and returns the parsed Report', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: validReport });

      const result = await service.createReport({
        reportedEntityType: 'user',
        reportedEntityId: 'user_2',
        category: 'harassment',
        severity: 'high',
        title: 'Inappropriate behaviour',
        description: 'A long enough description so the schema accepts it.',
      } as never);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports',
        expect.objectContaining({ category: 'harassment' })
      );
      expect(result.reportId).toBe('rep_1');
    });
  });

  describe('getReportById', () => {
    it('GETs the report-by-id endpoint and returns the parsed Report', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: validReport });

      const result = await service.getReportById('rep_1');

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/admin/moderation/reports/rep_1');
      expect(result.reportId).toBe('rep_1');
    });
  });

  describe('updateReportStatus', () => {
    it('PATCHes the status endpoint and returns the parsed Report', async () => {
      mockedApi.patch.mockResolvedValueOnce({ data: validReport });

      const result = await service.updateReportStatus('rep_1', {
        status: 'resolved',
        notes: 'looks good',
      });

      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports/rep_1/status',
        { status: 'resolved', notes: 'looks good' }
      );
      expect(result.reportId).toBe('rep_1');
    });
  });

  describe('assignReport', () => {
    it('POSTs to the assign endpoint with the moderator id', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: validReport });

      const result = await service.assignReport('rep_1', { moderatorId: 'mod_9' });

      expect(mockedApi.post).toHaveBeenCalledWith('/api/v1/admin/moderation/reports/rep_1/assign', {
        moderatorId: 'mod_9',
      });
      expect(result.reportId).toBe('rep_1');
    });
  });

  describe('escalateReport', () => {
    it('POSTs to the escalate endpoint with the escalation payload', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: validReport });

      const result = await service.escalateReport('rep_1', {
        escalatedTo: 'lead_1',
        reason: 'Needs senior review urgently.',
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports/rep_1/escalate',
        expect.objectContaining({ escalatedTo: 'lead_1' })
      );
      expect(result.reportId).toBe('rep_1');
    });
  });

  describe('getActions', () => {
    it('GETs the actions endpoint without a query string by default', async () => {
      mockedApi.get.mockResolvedValueOnce({
        success: true,
        data: [validAction],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const result = await service.getActions();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/admin/moderation/actions');
      expect(result.data[0]?.actionId).toBe('act_1');
    });

    it('appends a query string when filters are provided', async () => {
      mockedApi.get.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await service.getActions({ actionType: 'user_banned', isActive: true } as never);

      const calledWith = mockedApi.get.mock.calls[0]?.[0] as string;
      expect(calledWith).toContain('/api/v1/admin/moderation/actions?');
      expect(calledWith).toContain('actionType=user_banned');
      expect(calledWith).toContain('isActive=true');
    });
  });

  describe('getActiveActions', () => {
    it('GETs all active actions when no target user is given', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [validAction] });

      const result = await service.getActiveActions();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/admin/moderation/actions/active');
      expect(result).toHaveLength(1);
      expect(result[0]?.actionId).toBe('act_1');
    });

    it('scopes the request to a single, URL-encoded target user', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await service.getActiveActions('user a/b');

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/actions/active?userId=user%20a%2Fb'
      );
    });
  });

  describe('createAction', () => {
    it('POSTs the action body and returns the parsed action', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: validAction });

      const result = await service.createAction({
        targetEntityType: 'user',
        targetEntityId: 'user_2',
        actionType: 'user_banned',
        severity: 'high',
        reason: 'Repeated abuse',
      } as never);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/actions',
        expect.objectContaining({ actionType: 'user_banned' })
      );
      expect(result.actionId).toBe('act_1');
    });
  });

  describe('getMetrics', () => {
    it('GETs the metrics endpoint and returns parsed metrics', async () => {
      mockedApi.get.mockResolvedValueOnce({ success: true, data: validMetrics });

      const result = await service.getMetrics();

      expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/admin/moderation/metrics');
      expect(result.totalReports).toBe(5);
    });

    it('rejects when the metrics payload fails schema validation', async () => {
      mockedApi.get.mockResolvedValueOnce({ success: true, data: { totalReports: 'lots' } });

      await expect(service.getMetrics()).rejects.toBeDefined();
    });
  });

  describe('resolveReport', () => {
    it('marks the report resolved without creating an action when none is supplied', async () => {
      mockedApi.patch.mockResolvedValueOnce({ data: validReport });

      const result = await service.resolveReport('rep_1', 'all sorted');

      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports/rep_1/status',
        { status: 'resolved', notes: 'all sorted' }
      );
      expect(mockedApi.post).not.toHaveBeenCalled();
      expect(result.reportId).toBe('rep_1');
    });

    it('creates a moderation action tied to the report when action data is supplied', async () => {
      mockedApi.patch.mockResolvedValueOnce({ data: validReport });
      mockedApi.post.mockResolvedValueOnce({ data: validAction });

      await service.resolveReport('rep_1', 'banned them', {
        targetEntityType: 'user',
        targetEntityId: 'user_2',
        actionType: 'user_banned',
        severity: 'high',
        reason: 'Repeated abuse',
      } as never);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/actions',
        expect.objectContaining({ reportId: 'rep_1', actionType: 'user_banned' })
      );
    });
  });

  describe('dismissReport', () => {
    it('marks the report dismissed with the supplied notes', async () => {
      mockedApi.patch.mockResolvedValueOnce({ data: validReport });

      await service.dismissReport('rep_1', 'not a real issue');

      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports/rep_1/status',
        { status: 'dismissed', notes: 'not a real issue' }
      );
    });
  });

  describe('takeAction', () => {
    it('creates the action then promotes a pending report to under_review', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: validAction });
      mockedApi.get.mockResolvedValueOnce({ data: { ...validReport, status: 'pending' } });
      mockedApi.patch.mockResolvedValueOnce({
        data: { ...validReport, status: 'under_review' },
      });

      const result = await service.takeAction(
        'rep_1',
        {
          targetEntityType: 'user',
          targetEntityId: 'user_2',
          actionType: 'warning_issued',
          severity: 'medium',
          reason: 'First warning',
        } as never,
        'gave a warning'
      );

      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports/rep_1/status',
        { status: 'under_review', notes: 'gave a warning' }
      );
      expect(result.report.status).toBe('under_review');
      expect(result.action.actionId).toBe('act_1');
    });

    it('leaves a non-pending report untouched after creating the action', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: validAction });
      mockedApi.get.mockResolvedValueOnce({ data: { ...validReport, status: 'under_review' } });

      const result = await service.takeAction('rep_1', {
        targetEntityType: 'user',
        targetEntityId: 'user_2',
        actionType: 'warning_issued',
        severity: 'medium',
        reason: 'First warning',
      } as never);

      expect(mockedApi.patch).not.toHaveBeenCalled();
      expect(result.report.status).toBe('under_review');
    });
  });
});
