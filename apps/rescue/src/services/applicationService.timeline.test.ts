/**
 * Behaviour tests for the rescue application service's stage-transition,
 * timeline and bulk-action endpoints — the operations behind the application
 * review workflow. They pin down which endpoints are hit, how payloads are
 * shaped, how mixed-case timeline rows are normalised, and the friendly errors
 * surfaced to staff on failure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiServiceMock = vi.hoisted(() => ({
  get: vi.fn<(url: string) => Promise<unknown>>(),
  post: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
  patch: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
}));

vi.mock('./libraryServices', () => ({
  apiService: apiServiceMock,
}));

import { RescueApplicationService } from './applicationService';

describe('RescueApplicationService workflow operations', () => {
  const service = new RescueApplicationService();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getApplicationStats', () => {
    it('returns the statistics payload from the server', async () => {
      const stats = { total: 10, pending: 4 };
      apiServiceMock.get.mockResolvedValue(stats);

      const result = await service.getApplicationStats();

      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/applications/statistics');
      expect(result).toBe(stats);
    });

    it('throws a friendly error when stats cannot be loaded', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));

      await expect(service.getApplicationStats()).rejects.toThrow(
        'Failed to fetch application statistics from server'
      );
    });
  });

  describe('transitionStage', () => {
    it('dispatches a single-item batch through the bulk-update endpoint', async () => {
      apiServiceMock.patch.mockResolvedValue({ data: { ok: true } });

      const result = await service.transitionStage('app1', 'approve', 'approved', 'looks good');

      const [url, body] = apiServiceMock.patch.mock.calls[0] as [
        string,
        { applicationIds: string[] },
      ];
      expect(url).toBe('/api/v1/applications/bulk-update');
      expect(body.applicationIds).toEqual(['app1']);
      expect(result).toEqual({ ok: true });
    });

    it('rethrows transition failures', async () => {
      apiServiceMock.patch.mockRejectedValue(new Error('nope'));

      await expect(service.transitionStage('app1', 'approve', 'approved')).rejects.toThrow('nope');
    });
  });

  describe('getApplicationTimeline', () => {
    it('normalises snake_case timeline rows from a wrapped response', async () => {
      apiServiceMock.get.mockResolvedValue({
        timeline: [
          {
            timeline_id: 't1',
            application_id: 'app1',
            event_type: 'status_change',
            description: 'Moved to review',
            created_at: '2024-01-01T00:00:00Z',
            created_by_system: true,
            new_stage: 'reviewing',
          },
        ],
      });

      const [item] = await service.getApplicationTimeline('app1');

      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/applications/app1/timeline');
      expect(item.id).toBe('t1');
      expect(item.event).toBe('status_change');
      expect(item.userName).toBe('System');
      expect(item.isSystemGenerated).toBe(true);
      expect(item.newStage).toBe('reviewing');
    });

    it('derives a user name from the CreatedBy association', async () => {
      apiServiceMock.get.mockResolvedValue([
        {
          id: 't2',
          event: 'note_added',
          CreatedBy: { firstName: 'Sarah', lastName: 'Johnson' },
        },
      ]);

      const [item] = await service.getApplicationTimeline('app1');

      expect(item.userName).toBe('Sarah Johnson');
    });

    it('rethrows so callers can render an error state', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('timeline down'));

      await expect(service.getApplicationTimeline('app1')).rejects.toThrow('timeline down');
    });
  });

  describe('addTimelineEvent', () => {
    it('posts a titled event derived from the event name', async () => {
      apiServiceMock.post.mockResolvedValue({ ok: true });

      await service.addTimelineEvent('app1', 'home_visit_scheduled', 'Visit booked', {
        staff: 's1',
      });

      const [url, body] = apiServiceMock.post.mock.calls[0] as [
        string,
        { event_type: string; title: string; metadata: unknown },
      ];
      expect(url).toBe('/api/v1/applications/app1/timeline/events');
      expect(body.event_type).toBe('home_visit_scheduled');
      expect(body.title).toBe('Home Visit Scheduled');
      expect(body.metadata).toEqual({ staff: 's1' });
    });

    it('throws a friendly error on failure', async () => {
      apiServiceMock.post.mockRejectedValue(new Error('x'));

      await expect(service.addTimelineEvent('app1', 'e', 'd')).rejects.toThrow(
        'Failed to add timeline event on server'
      );
    });
  });

  describe('addTimelineNote', () => {
    it('posts a note with its content captured in metadata', async () => {
      apiServiceMock.post.mockResolvedValue({ ok: true });

      await service.addTimelineNote('app1', 'Follow up', 'Call applicant', 'reminder');

      const [url, body] = apiServiceMock.post.mock.calls[0] as [
        string,
        {
          title: string;
          description: string;
          metadata: { note_type: string; full_content: string };
        },
      ];
      expect(url).toBe('/api/v1/applications/app1/timeline/notes');
      expect(body.title).toBe('Follow up');
      expect(body.metadata.note_type).toBe('reminder');
      expect(body.metadata.full_content).toBe('Call applicant');
    });

    it('defaults the note type to general', async () => {
      apiServiceMock.post.mockResolvedValue({ ok: true });

      await service.addTimelineNote('app1', 'Note', 'Body');

      const [, body] = apiServiceMock.post.mock.calls[0] as [
        string,
        { metadata: { note_type: string } },
      ];
      expect(body.metadata.note_type).toBe('general');
    });
  });

  describe('getApplicationTimelineStats', () => {
    it('returns the timeline stats payload', async () => {
      const payload = { totalEvents: 3 };
      apiServiceMock.get.mockResolvedValue(payload);

      const result = await service.getApplicationTimelineStats('app1');

      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/applications/app1/timeline/stats');
      expect(result).toBe(payload);
    });

    it('throws a friendly error on failure', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));

      await expect(service.getApplicationTimelineStats('app1')).rejects.toThrow(
        'Failed to fetch application timeline statistics'
      );
    });
  });

  describe('performBulkAction', () => {
    it('maps an approve action to a status update over the bulk endpoint', async () => {
      apiServiceMock.patch.mockResolvedValue({ successCount: 2 });

      await service.performBulkAction({ type: 'approve', applicationIds: ['a', 'b'] } as never);

      const [url, body] = apiServiceMock.patch.mock.calls[0] as [
        string,
        { applicationIds: string[]; updates: { status?: string } },
      ];
      expect(url).toBe('/api/v1/applications/bulk-update');
      expect(body.applicationIds).toEqual(['a', 'b']);
      expect(body.updates.status).toBe('approved');
    });

    it('maps a reject action to a rejected status', async () => {
      apiServiceMock.patch.mockResolvedValue({});

      await service.performBulkAction({ type: 'reject', applicationIds: ['a'] } as never);

      const [, body] = apiServiceMock.patch.mock.calls[0] as [
        string,
        { updates: { status?: string } },
      ];
      expect(body.updates.status).toBe('rejected');
    });

    it('throws a friendly error on failure', async () => {
      apiServiceMock.patch.mockRejectedValue(new Error('x'));

      await expect(
        service.performBulkAction({ type: 'approve', applicationIds: ['a'] } as never)
      ).rejects.toThrow('Failed to perform bulk action on server');
    });
  });

  describe('updateReferenceCheck', () => {
    it('patches the reference with its id and status', async () => {
      apiServiceMock.patch.mockResolvedValue({ ok: true });

      await service.updateReferenceCheck('app1', 'ref-0', 'verified', 'spoke to them');

      const [url, body] = apiServiceMock.patch.mock.calls[0] as [
        string,
        { referenceId: string; status: string; notes?: string },
      ];
      expect(url).toBe('/api/v1/applications/app1/references');
      expect(body.referenceId).toBe('ref-0');
      expect(body.status).toBe('verified');
      expect(body.notes).toBe('spoke to them');
    });

    it('throws a friendly error on failure', async () => {
      apiServiceMock.patch.mockRejectedValue(new Error('x'));

      await expect(service.updateReferenceCheck('app1', 'ref-0', 'verified')).rejects.toThrow(
        'Failed to update reference check on server'
      );
    });
  });
});
