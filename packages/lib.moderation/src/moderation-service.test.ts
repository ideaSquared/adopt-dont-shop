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

// What GET/POST /moderation/actions really returns (moderatorActionToView):
// nulls for unset optionals and no updatedAt.
const gatewayAction = {
  actionId: 'act-1',
  moderatorId: 'mod-1',
  actionType: 'user_suspended',
  severity: 'high',
  reason: 'repeated spam',
  description: null,
  targetEntityType: 'user',
  targetEntityId: 'usr-1',
  targetUserId: 'usr-1',
  reportId: 'rep-1',
  duration: null,
  metadata: {},
  createdAt: '2026-06-01T12:00:00.000Z',
  expiresAt: null,
};

describe('gateway-shaped moderator action responses', () => {
  let moderationService: ModerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    moderationService = new ModerationService();
  });

  it('createAction accepts nulls for unset fields and a missing updatedAt', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: gatewayAction });

    const action = await moderationService.createAction({
      reportId: 'rep-1',
      targetEntityType: 'user',
      targetEntityId: 'usr-1',
      targetUserId: 'usr-1',
      actionType: 'user_suspended',
      severity: 'high',
      reason: 'repeated spam',
    });

    expect(action.actionId).toBe('act-1');
    expect(action.duration).toBeUndefined();
    expect(action.expiresAt).toBeUndefined();
  });

  it('takeAction still resolves the report after a gateway-shaped action response', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: gatewayAction });
    mockedApi.patch.mockResolvedValueOnce({ data: { ...validReport, status: 'resolved' } });

    await moderationService.takeAction(
      'rep-1',
      {
        reportId: 'rep-1',
        targetEntityType: 'user',
        targetEntityId: 'usr-1',
        actionType: 'user_suspended',
        severity: 'high',
        reason: 'repeated spam',
      },
      'notes'
    );

    expect(mockedApi.patch).toHaveBeenCalled();
  });
});

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
        resolutionNotes: 'looks good',
      });

      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports/rep_1/status',
        { status: 'resolved', resolutionNotes: 'looks good' }
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
        { status: 'resolved', resolutionNotes: 'all sorted' }
      );
      expect(mockedApi.post).not.toHaveBeenCalled();
      expect(result.reportId).toBe('rep_1');
    });

    it('applies the chosen action, then resolves the report with the matching resolution (B10)', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: validAction });
      mockedApi.patch.mockResolvedValueOnce({ data: validReport });

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
      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports/rep_1/status',
        { status: 'resolved', resolution: 'user_banned', resolutionNotes: 'banned them' }
      );
      expect(mockedApi.post.mock.invocationCallOrder[0]).toBeLessThan(
        mockedApi.patch.mock.invocationCallOrder[0]
      );
    });

    it('leaves the report untouched when the action is rejected', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('403'));

      await expect(
        service.resolveReport('rep_1', 'x', {
          targetEntityType: 'user',
          targetEntityId: 'user_2',
          actionType: 'user_suspended',
          severity: 'high',
          reason: 'Repeated abuse',
        } as never)
      ).rejects.toThrow('403');
      expect(mockedApi.patch).not.toHaveBeenCalled();
    });
  });

  describe('dismissReport', () => {
    it('marks the report dismissed with the supplied notes', async () => {
      mockedApi.patch.mockResolvedValueOnce({ data: validReport });

      await service.dismissReport('rep_1', 'not a real issue');

      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports/rep_1/status',
        { status: 'dismissed', resolutionNotes: 'not a real issue' }
      );
    });
  });

  describe('takeAction', () => {
    it('creates the action then resolves the report with the matching resolution (B11)', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: validAction });
      mockedApi.patch.mockResolvedValueOnce({ data: { ...validReport, status: 'resolved' } });

      const result = await service.takeAction(
        'rep_1',
        {
          targetEntityType: 'user',
          targetEntityId: 'user_2',
          actionType: 'user_suspended',
          severity: 'medium',
          reason: 'Suspended',
        } as never,
        'suspended'
      );

      // 'under_review' is not a transition the backend accepts.
      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports/rep_1/status',
        { status: 'resolved', resolution: 'user_suspended', resolutionNotes: 'suspended' }
      );
      expect(result.report.status).toBe('resolved');
      expect(result.action.actionId).toBe('act_1');
    });

    it('records no_action for actions without a dedicated resolution', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: validAction });
      mockedApi.patch.mockResolvedValueOnce({ data: validReport });

      await service.takeAction('rep_1', {
        targetEntityType: 'user',
        targetEntityId: 'user_2',
        actionType: 'account_restricted',
        severity: 'medium',
        reason: 'Restricted',
      } as never);

      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports/rep_1/status',
        expect.objectContaining({ resolution: 'no_action' })
      );
    });
  });

  describe('bulkUpdateReports', () => {
    it('parses the { success, updated } response the gateway returns (B10)', async () => {
      mockedApi.post.mockResolvedValueOnce({ success: true, updated: 2, data: [] });

      const result = await service.bulkUpdateReports({
        reportIds: ['a', 'b'],
        action: 'dismiss',
      });

      expect(result).toEqual({ success: true, updated: 2 });
    });
  });

  describe('legacy report resolutions (B10)', () => {
    it.each(['resolved', 'dismissed'])(
      'a stored resolution of %s does not fail the report list parse',
      async legacy => {
        mockedApi.get.mockResolvedValueOnce({
          data: [{ ...validReport, resolution: legacy }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });

        const result = await service.getReports();

        expect(result.data[0].resolution).toBe('no_action');
      }
    );
  });
});
