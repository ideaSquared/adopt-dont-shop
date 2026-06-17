import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiServiceMock = vi.hoisted(() => ({
  get: vi.fn<(url: string) => Promise<unknown>>(),
  post: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
  put: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
  patch: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
  delete: vi.fn<(url: string) => Promise<unknown>>(),
}));

vi.mock('./libraryServices', () => ({
  apiService: apiServiceMock,
}));

import { RescueEventsService } from './eventsService';

/**
 * Behaviour tests for the rescue events service. Events power the rescue's
 * community calendar: staff create, schedule, publish and manage attendance.
 * The service must forward the right filters, normalise mixed-case API rows
 * and surface friendly errors for write failures.
 */
describe('RescueEventsService', () => {
  const service = new RescueEventsService();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getEvents', () => {
    it('fetches all events with no query string when no filter is given', async () => {
      apiServiceMock.get.mockResolvedValue([]);

      await service.getEvents();

      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/events');
    });

    it('forwards type, status, search and visibility filters as query params', async () => {
      apiServiceMock.get.mockResolvedValue([]);

      await service.getEvents({
        type: 'adoption',
        status: 'published',
        searchQuery: 'spring',
        assignedStaff: 'staff1',
        isPublic: true,
        dateRange: {
          start: new Date('2024-01-01T00:00:00Z'),
          end: new Date('2024-02-01T00:00:00Z'),
        },
      } as never);

      const [url] = apiServiceMock.get.mock.calls[0];
      const params = new URLSearchParams(url.slice(url.indexOf('?') + 1));
      expect(params.get('type')).toBe('adoption');
      expect(params.get('status')).toBe('published');
      expect(params.get('search')).toBe('spring');
      expect(params.get('assignedStaff')).toBe('staff1');
      expect(params.get('isPublic')).toBe('true');
      expect(params.get('startDate')).toBe('2024-01-01T00:00:00.000Z');
    });

    it('omits "all" sentinel values from the query', async () => {
      apiServiceMock.get.mockResolvedValue([]);

      await service.getEvents({ type: 'all', status: 'all' } as never);

      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/events');
    });

    it('normalises snake_case event rows from a wrapped response', async () => {
      apiServiceMock.get.mockResolvedValue({
        data: [
          {
            event_id: 'e1',
            rescue_id: 'r1',
            name: 'Adoption Day',
            start_date: '2024-03-01',
            is_public: false,
            current_attendance: 5,
          },
        ],
      });

      const [event] = await service.getEvents();

      expect(event.id).toBe('e1');
      expect(event.rescueId).toBe('r1');
      expect(event.name).toBe('Adoption Day');
      expect(event.startDate).toBe('2024-03-01');
      expect(event.isPublic).toBe(false);
      expect(event.currentAttendance).toBe(5);
    });

    it('reads events from an "events" wrapper key', async () => {
      apiServiceMock.get.mockResolvedValue({ events: [{ id: 'e2', name: 'Fair' }] });

      const result = await service.getEvents();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Fair');
    });

    it('returns an empty array on failure', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('down'));

      await expect(service.getEvents()).resolves.toEqual([]);
    });
  });

  describe('getEvent', () => {
    it('returns a single normalised event', async () => {
      apiServiceMock.get.mockResolvedValue({ data: { id: 'e1', name: 'Gala' } });

      const event = await service.getEvent('e1');

      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/events/e1');
      expect(event?.name).toBe('Gala');
    });

    it('returns null when the lookup fails', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('404'));

      await expect(service.getEvent('missing')).resolves.toBeNull();
    });
  });

  describe('createEvent', () => {
    it('posts a draft event with snake_case payload fields', async () => {
      apiServiceMock.post.mockResolvedValue({ data: { id: 'e9', name: 'New Event' } });

      const result = await service.createEvent({
        name: 'New Event',
        description: 'desc',
        type: 'community',
        startDate: '2024-05-01',
        endDate: '2024-05-02',
        location: { type: 'physical', address: 'a', city: 'c', postcode: 'p' },
        capacity: 50,
        registrationRequired: true,
        isPublic: true,
      } as never);

      const [url, payload] = apiServiceMock.post.mock.calls[0];
      expect(url).toBe('/api/v1/events');
      expect(payload).toMatchObject({
        name: 'New Event',
        start_date: '2024-05-01',
        registration_required: true,
        status: 'draft',
        featured_pets: [],
        assigned_staff: [],
      });
      expect(result.id).toBe('e9');
    });

    it('throws a friendly error when creation fails', async () => {
      apiServiceMock.post.mockRejectedValue(new Error('500'));

      await expect(service.createEvent({} as never)).rejects.toThrow(
        'Failed to create event. Please try again.'
      );
    });
  });

  describe('updateEvent', () => {
    it('only sends the fields that were provided', async () => {
      apiServiceMock.put.mockResolvedValue({ data: { id: 'e1', name: 'Renamed' } });

      await service.updateEvent('e1', { name: 'Renamed', status: 'published' } as never);

      const [url, payload] = apiServiceMock.put.mock.calls[0];
      expect(url).toBe('/api/v1/events/e1');
      expect(payload).toEqual({ name: 'Renamed', status: 'published' });
    });

    it('throws a friendly error when the update fails', async () => {
      apiServiceMock.put.mockRejectedValue(new Error('boom'));

      await expect(service.updateEvent('e1', { name: 'x' } as never)).rejects.toThrow(
        'Failed to update event. Please try again.'
      );
    });
  });

  describe('deleteEvent', () => {
    it('deletes by id', async () => {
      apiServiceMock.delete.mockResolvedValue(undefined);

      await service.deleteEvent('e1');

      expect(apiServiceMock.delete).toHaveBeenCalledWith('/api/v1/events/e1');
    });

    it('throws a friendly error when deletion fails', async () => {
      apiServiceMock.delete.mockRejectedValue(new Error('x'));

      await expect(service.deleteEvent('e1')).rejects.toThrow(
        'Failed to delete event. Please try again.'
      );
    });
  });

  describe('attendees', () => {
    it('registers an attendee and normalises the response', async () => {
      apiServiceMock.post.mockResolvedValue({
        data: { user_id: 'u1', name: 'Guest', email: 'g@x.com', registered_at: '2024-01-01' },
      });

      const attendee = await service.registerAttendee('e1', {
        userId: 'u1',
        name: 'Guest',
        email: 'g@x.com',
      });

      expect(apiServiceMock.post).toHaveBeenCalledWith('/api/v1/events/e1/attendees', {
        userId: 'u1',
        name: 'Guest',
        email: 'g@x.com',
      });
      expect(attendee.userId).toBe('u1');
      expect(attendee.registeredAt).toBe('2024-01-01');
    });

    it('checks in an attendee', async () => {
      apiServiceMock.patch.mockResolvedValue({ data: { user_id: 'u1', checked_in: true } });

      const attendee = await service.checkInAttendee('e1', 'u1');

      const [url, payload] = apiServiceMock.patch.mock.calls[0];
      expect(url).toBe('/api/v1/events/e1/attendees/u1/check-in');
      expect(payload).toMatchObject({ checked_in: true });
      expect(attendee.checkedIn).toBe(true);
    });

    it('lists attendees from a wrapped response', async () => {
      apiServiceMock.get.mockResolvedValue({ attendees: [{ user_id: 'u1', name: 'A' }] });

      const result = await service.getEventAttendees('e1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('A');
    });

    it('returns an empty attendee list on failure', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));

      await expect(service.getEventAttendees('e1')).resolves.toEqual([]);
    });
  });

  describe('analytics and status', () => {
    it('returns analytics data', async () => {
      apiServiceMock.get.mockResolvedValue({ data: { totalRegistered: 10 } });

      const analytics = await service.getEventAnalytics('e1');

      expect(apiServiceMock.get).toHaveBeenCalledWith('/api/v1/events/e1/analytics');
      expect(analytics).toEqual({ totalRegistered: 10 });
    });

    it('returns null when analytics fail', async () => {
      apiServiceMock.get.mockRejectedValue(new Error('x'));

      await expect(service.getEventAnalytics('e1')).resolves.toBeNull();
    });

    it('updates event status', async () => {
      apiServiceMock.patch.mockResolvedValue({ data: { id: 'e1', status: 'cancelled' } });

      const event = await service.updateEventStatus('e1', 'cancelled');

      expect(apiServiceMock.patch).toHaveBeenCalledWith('/api/v1/events/e1/status', {
        status: 'cancelled',
      });
      expect(event.status).toBe('cancelled');
    });

    it('throws a friendly error when a status update fails', async () => {
      apiServiceMock.patch.mockRejectedValue(new Error('x'));

      await expect(service.updateEventStatus('e1', 'cancelled')).rejects.toThrow(
        'Failed to update event status. Please try again.'
      );
    });
  });
});
