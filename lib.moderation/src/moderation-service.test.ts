import { ModerationService } from './moderation-service';
import { apiService } from '@adopt-dont-shop/lib.api';

jest.mock('@adopt-dont-shop/lib.api');

const mockedApi = apiService as jest.Mocked<typeof apiService>;

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

describe('ModerationService', () => {
  let service: ModerationService;

  beforeEach(() => {
    jest.clearAllMocks();
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
});
