import { apiService } from './libraryServices';
import type {
  Event,
  CreateEventInput,
  UpdateEventInput,
  EventFilter,
  EventAttendee,
  EventAnalytics,
} from '../types/events';

/**
 * Events Service for Rescue App
 * Manages event creation, scheduling, attendance, and analytics
 */
export class RescueEventsService {
  private apiService: typeof apiService;

  constructor(customApiService?: typeof apiService) {
    this.apiService = customApiService || apiService;
  }

  /**
   * Get events with optional filtering
   */
  async getEvents(filter?: EventFilter): Promise<Event[]> {
    try {
      const params = new URLSearchParams();

      if (filter?.type && filter.type !== 'all') {
        params.append('type', filter.type);
      }
      if (filter?.status && filter.status !== 'all') {
        params.append('status', filter.status);
      }
      if (filter?.dateRange) {
        params.append('startDate', filter.dateRange.start.toISOString());
        params.append('endDate', filter.dateRange.end.toISOString());
      }
      if (filter?.searchQuery) {
        params.append('search', filter.searchQuery);
      }
      if (filter?.assignedStaff) {
        params.append('assignedStaff', filter.assignedStaff);
      }
      if (filter?.isPublic !== undefined) {
        params.append('isPublic', filter.isPublic.toString());
      }

      const response = await this.apiService.get<any>(
        `/api/v1/events${params.toString() ? `?${params}` : ''}`
      );

      // Handle different response formats
      if (Array.isArray(response)) {
        return response.map(this.transformEvent);
      } else if (response?.data && Array.isArray(response.data)) {
        return response.data.map(this.transformEvent);
      } else if (response?.events && Array.isArray(response.events)) {
        return response.events.map(this.transformEvent);
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch events:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<Event | null> {
    try {
      const response = await this.apiService.get<any>(`/api/v1/events/${eventId}`);
      return this.transformEvent(response.data || response);
    } catch (error) {
      console.error(`Failed to fetch event ${eventId}:`, error);
      return null;
    }
  }

  /**
   * Create a new event
   */
  async createEvent(eventData: CreateEventInput): Promise<Event> {
    try {
      const payload = {
        name: eventData.name,
        description: eventData.description,
        type: eventData.type,
        start_date: eventData.startDate,
        end_date: eventData.endDate,
        location: eventData.location,
        capacity: eventData.capacity,
        registration_required: eventData.registrationRequired,
        featured_pets: eventData.featuredPets || [],
        assigned_staff: eventData.assignedStaff || [],
        is_public: eventData.isPublic,
        image_url: eventData.imageUrl,
        status: 'draft', // New events start as drafts
      };

      const response = await this.apiService.post<any>('/api/v1/events', payload);
      return this.transformEvent(response.data || response);
    } catch (error) {
      console.error('Failed to create event:', error);
      throw new Error('Failed to create event. Please try again.');
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, updates: UpdateEventInput): Promise<Event> {
    try {
      const payload: any = {};

      if (updates.name !== undefined) {
        payload.name = updates.name;
      }
      if (updates.description !== undefined) {
        payload.description = updates.description;
      }
      if (updates.type !== undefined) {
        payload.type = updates.type;
      }
      if (updates.startDate !== undefined) {
        payload.start_date = updates.startDate;
      }
      if (updates.endDate !== undefined) {
        payload.end_date = updates.endDate;
      }
      if (updates.location !== undefined) {
        payload.location = updates.location;
      }
      if (updates.capacity !== undefined) {
        payload.capacity = updates.capacity;
      }
      if (updates.registrationRequired !== undefined) {
        payload.registration_required = updates.registrationRequired;
      }
      if (updates.featuredPets !== undefined) {
        payload.featured_pets = updates.featuredPets;
      }
      if (updates.assignedStaff !== undefined) {
        payload.assigned_staff = updates.assignedStaff;
      }
      if (updates.isPublic !== undefined) {
        payload.is_public = updates.isPublic;
      }
      if (updates.imageUrl !== undefined) {
        payload.image_url = updates.imageUrl;
      }
      if (updates.status !== undefined) {
        payload.status = updates.status;
      }

      const response = await this.apiService.put<any>(`/api/v1/events/${eventId}`, payload);
      return this.transformEvent(response.data || response);
    } catch (error) {
      console.error(`Failed to update event ${eventId}:`, error);
      throw new Error('Failed to update event. Please try again.');
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.apiService.delete(`/api/v1/events/${eventId}`);
    } catch (error) {
      console.error(`Failed to delete event ${eventId}:`, error);
      throw new Error('Failed to delete event. Please try again.');
    }
  }

  /**
   * Register an attendee for an event
   */
  async registerAttendee(
    eventId: string,
    attendeeData: { userId: string; name: string; email: string; notes?: string }
  ): Promise<EventAttendee> {
    try {
      const response = await this.apiService.post<any>(
        `/api/v1/events/${eventId}/attendees`,
        attendeeData
      );
      return this.transformAttendee(response.data || response);
    } catch (error) {
      console.error(`Failed to register attendee for event ${eventId}:`, error);
      throw new Error('Failed to register attendee. Please try again.');
    }
  }

  /**
   * Check in an attendee at the event
   */
  async checkInAttendee(eventId: string, userId: string): Promise<EventAttendee> {
    try {
      const response = await this.apiService.patch<any>(
        `/api/v1/events/${eventId}/attendees/${userId}/check-in`,
        {
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        }
      );
      return this.transformAttendee(response.data || response);
    } catch (error) {
      console.error(`Failed to check in attendee for event ${eventId}:`, error);
      throw new Error('Failed to check in attendee. Please try again.');
    }
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics(eventId: string): Promise<EventAnalytics | null> {
    try {
      const response = await this.apiService.get<any>(`/api/v1/events/${eventId}/analytics`);
      return response.data || response;
    } catch (error) {
      console.error(`Failed to fetch analytics for event ${eventId}:`, error);
      return null;
    }
  }

  /**
   * Get attendees for an event
   */
  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    try {
      const response = await this.apiService.get<any>(`/api/v1/events/${eventId}/attendees`);

      if (Array.isArray(response)) {
        return response.map(this.transformAttendee);
      } else if (response?.data && Array.isArray(response.data)) {
        return response.data.map(this.transformAttendee);
      } else if (response?.attendees && Array.isArray(response.attendees)) {
        return response.attendees.map(this.transformAttendee);
      }

      return [];
    } catch (error) {
      console.error(`Failed to fetch attendees for event ${eventId}:`, error);
      return [];
    }
  }

  /**
   * Update event status
   */
  async updateEventStatus(eventId: string, status: string): Promise<Event> {
    try {
      const response = await this.apiService.patch<any>(`/api/v1/events/${eventId}/status`, {
        status,
      });
      return this.transformEvent(response.data || response);
    } catch (error) {
      console.error(`Failed to update event status for ${eventId}:`, error);
      throw new Error('Failed to update event status. Please try again.');
    }
  }

  /**
   * Transform event data from API format to application format
   */
  private transformEvent = (event: any): Event => {
    return {
      id: event.id || event.event_id,
      rescueId: event.rescueId || event.rescue_id,
      name: event.name,
      description: event.description || '',
      type: event.type,
      startDate: event.startDate || event.start_date,
      endDate: event.endDate || event.end_date,
      location: event.location || {
        type: 'physical',
        address: event.address || '',
        city: event.city || '',
        postcode: event.postcode || '',
      },
      capacity: event.capacity,
      registrationRequired: event.registrationRequired ?? event.registration_required ?? false,
      status: event.status || 'draft',
      featuredPets: event.featuredPets || event.featured_pets || [],
      assignedStaff: event.assignedStaff || event.assigned_staff || [],
      isPublic: event.isPublic ?? event.is_public ?? true,
      imageUrl: event.imageUrl || event.image_url,
      attendees: event.attendees ? event.attendees.map(this.transformAttendee) : [],
      currentAttendance: event.currentAttendance || event.current_attendance || 0,
      createdAt: event.createdAt || event.created_at,
      updatedAt: event.updatedAt || event.updated_at,
      createdBy: event.createdBy || event.created_by,
    };
  };

  /**
   * Transform attendee data from API format
   */
  private transformAttendee = (attendee: any): EventAttendee => {
    return {
      userId: attendee.userId || attendee.user_id,
      name: attendee.name,
      email: attendee.email,
      registeredAt: attendee.registeredAt || attendee.registered_at,
      checkedIn: attendee.checkedIn ?? attendee.checked_in ?? false,
      checkedInAt: attendee.checkedInAt || attendee.checked_in_at,
      notes: attendee.notes,
    };
  };
}

// Export a default instance for easy use
export const eventsService = new RescueEventsService();

// Export the class as default for custom configurations
export default RescueEventsService;
