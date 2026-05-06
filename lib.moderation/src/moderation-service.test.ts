import { ModerationService } from './moderation-service';

const apiServiceMock = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  put: jest.fn(),
};

jest.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: apiServiceMock,
}));

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
    it('issues a GET against the reports endpoint and returns parsed payload', async () => {
      apiServiceMock.get.mockResolvedValueOnce({
        success: true,
        data: [validReport],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const result = await service.getReports();
      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/admin/moderation/reports');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.reportId).toBe('rep_1');
    });

    it('appends a query string when filters are provided', async () => {
      apiServiceMock.get.mockResolvedValueOnce({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      await service.getReports({ status: 'pending', page: 2 } as never);
      expect(apiServiceMock.get).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports?status=pending&page=2'
      );
    });

    it('rejects when the backend payload fails schema validation', async () => {
      apiServiceMock.get.mockResolvedValueOnce({
        success: true,
        data: [{ reportId: 1 }],
        pagination: {},
      });

      await expect(service.getReports()).rejects.toBeDefined();
    });
  });

  describe('createReport', () => {
    it('POSTs the body and returns the parsed Report', async () => {
      apiServiceMock.post.mockResolvedValueOnce({ data: validReport });

      const result = await service.createReport({
        reportedEntityType: 'user',
        reportedEntityId: 'user_2',
        category: 'harassment',
        severity: 'high',
        title: 'Inappropriate behaviour',
        description: 'A long enough description so the schema accepts it.',
      } as never);

      expect(apiServiceMock.post).toHaveBeenCalledWith(
        '/api/v1/admin/moderation/reports',
        expect.objectContaining({ category: 'harassment' })
      );
      expect(result.reportId).toBe('rep_1');
    });
  });
});
