import { vi } from 'vitest';
import express, { NextFunction, Response } from 'express';
import request from 'supertest';
import { AuthenticatedRequest } from '../../types';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logSecurity: vi.fn() },
}));

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-min-32-characters-long-12345',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-12345',
    SESSION_SECRET: 'test-session-secret',
    CSRF_SECRET: 'test-csrf-secret',
  },
}));

vi.mock('../../services/applicationTimeline.service', () => ({
  default: {
    getApplicationTimeline: vi.fn(),
    getTimelineStats: vi.fn(),
    createEvent: vi.fn(),
    createNoteAddedEvent: vi.fn(),
    getBulkTimelineStats: vi.fn(),
  },
}));

import ApplicationTimelineService from '../../services/applicationTimeline.service';
import applicationTimelineRouter from '../../routes/applicationTimeline.routes';

const mockGetTimeline = vi.mocked(ApplicationTimelineService.getApplicationTimeline);
const mockGetStats = vi.mocked(ApplicationTimelineService.getTimelineStats);
const mockCreateEvent = vi.mocked(ApplicationTimelineService.createEvent);
const mockCreateNote = vi.mocked(ApplicationTimelineService.createNoteAddedEvent);
const mockBulkStats = vi.mocked(ApplicationTimelineService.getBulkTimelineStats);

const buildApp = (
  authMiddleware?: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void
) => {
  const app = express();
  app.use(express.json());
  if (authMiddleware) {
    app.use(authMiddleware);
  }
  app.use('/api/applications', applicationTimelineRouter);
  return app;
};

const attachUser =
  (userId: string) => (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    req.user = { userId, email: 'x@x.com' } as AuthenticatedRequest['user'];
    next();
  };

describe('Application timeline routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/applications/:application_id/timeline', () => {
    it('returns the timeline with pagination metadata', async () => {
      mockGetTimeline.mockResolvedValue([
        { eventId: 'e1', title: 'Submitted' },
        { eventId: 'e2', title: 'Reviewed' },
      ]);
      const res = await request(buildApp()).get('/api/applications/app-1/timeline');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toMatchObject({ offset: 0, total: 2 });
      expect(mockGetTimeline).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({ limit: undefined, offset: undefined })
      );
    });

    it('parses limit, offset and event_types query params', async () => {
      mockGetTimeline.mockResolvedValue([]);
      await request(buildApp())
        .get('/api/applications/app-1/timeline')
        .query({ limit: '5', offset: '10', event_types: 'note_added,status_changed' });

      expect(mockGetTimeline).toHaveBeenCalledWith('app-1', {
        limit: 5,
        offset: 10,
        event_types: ['note_added', 'status_changed'],
      });
    });

    it('returns 500 when the service throws', async () => {
      mockGetTimeline.mockRejectedValue(new Error('boom'));
      const res = await request(buildApp()).get('/api/applications/app-1/timeline');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/applications/:application_id/timeline/stats', () => {
    it('returns the stats for the application', async () => {
      mockGetStats.mockResolvedValue({ total: 4, byType: { note_added: 2 } });
      const res = await request(buildApp()).get('/api/applications/app-1/timeline/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(4);
      expect(mockGetStats).toHaveBeenCalledWith('app-1');
    });
  });

  describe('POST /api/applications/:application_id/timeline/events', () => {
    it('returns 401 when no user is attached to the request', async () => {
      const res = await request(buildApp())
        .post('/api/applications/app-1/timeline/events')
        .send({ event_type: 'note_added', title: 'Hi', description: 'There' });

      expect(res.status).toBe(401);
      expect(mockCreateEvent).not.toHaveBeenCalled();
    });

    it('creates a manual event when authenticated', async () => {
      mockCreateEvent.mockResolvedValue({ eventId: 'e1', title: 'Hi' });
      const res = await request(buildApp(attachUser('user-1')))
        .post('/api/applications/app-1/timeline/events')
        .send({ event_type: 'note_added', title: 'Hi', description: 'There' });

      expect(res.status).toBe(201);
      expect(res.body.data.eventId).toBe('e1');
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          application_id: 'app-1',
          event_type: 'note_added',
          created_by: 'user-1',
          created_by_system: false,
        })
      );
    });
  });

  describe('POST /api/applications/:application_id/timeline/notes', () => {
    it('returns 401 when no user is attached', async () => {
      const res = await request(buildApp())
        .post('/api/applications/app-1/timeline/notes')
        .send({ content: 'A note' });
      expect(res.status).toBe(401);
    });

    it('records the note via the service when authenticated', async () => {
      mockCreateNote.mockResolvedValue({ eventId: 'e1' });
      const res = await request(buildApp(attachUser('user-1')))
        .post('/api/applications/app-1/timeline/notes')
        .send({ note_type: 'reviewer', content: 'Looks good' });

      expect(res.status).toBe(201);
      expect(mockCreateNote).toHaveBeenCalledWith('app-1', 'reviewer', 'Looks good', 'user-1');
    });
  });

  describe('POST /api/applications/timeline/bulk-stats', () => {
    it('returns 400 when applicationIds is missing', async () => {
      const res = await request(buildApp()).post('/api/applications/timeline/bulk-stats').send({});
      expect(res.status).toBe(400);
      expect(mockBulkStats).not.toHaveBeenCalled();
    });

    it('returns 400 when applicationIds is not an array', async () => {
      const res = await request(buildApp())
        .post('/api/applications/timeline/bulk-stats')
        .send({ applicationIds: 'not-an-array' });
      expect(res.status).toBe(400);
    });

    it('returns the bulk stats summary', async () => {
      mockBulkStats.mockResolvedValue({ 'app-1': { total: 3 } });
      const res = await request(buildApp())
        .post('/api/applications/timeline/bulk-stats')
        .send({ applicationIds: ['app-1'] });
      expect(res.status).toBe(200);
      expect(res.body.summaries).toEqual({ 'app-1': { total: 3 } });
    });
  });
});
