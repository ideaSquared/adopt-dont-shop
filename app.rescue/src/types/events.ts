/**
 * Event Types and Interfaces
 * Defines all types related to event management in the rescue application
 */

export type EventType = 'adoption' | 'fundraising' | 'volunteer' | 'community';

export type EventStatus = 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';

export interface EventLocation {
  type: 'physical' | 'virtual';
  address?: string;
  city?: string;
  postcode?: string;
  virtualLink?: string;
  venue?: string;
}

export interface EventAttendee {
  userId: string;
  name: string;
  email: string;
  registeredAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
  notes?: string;
}

export interface Event {
  id: string;
  rescueId: string;
  name: string;
  description: string;
  type: EventType;
  startDate: string;
  endDate: string;
  location: EventLocation;
  capacity?: number;
  registrationRequired: boolean;
  status: EventStatus;
  featuredPets?: string[];
  assignedStaff?: string[];
  isPublic: boolean;
  imageUrl?: string;
  attendees?: EventAttendee[];
  currentAttendance?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateEventInput {
  name: string;
  description: string;
  type: EventType;
  startDate: string;
  endDate: string;
  location: EventLocation;
  capacity?: number;
  registrationRequired: boolean;
  featuredPets?: string[];
  assignedStaff?: string[];
  isPublic: boolean;
  imageUrl?: string;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  status?: EventStatus;
}

export interface EventFilter {
  type?: EventType | 'all';
  status?: EventStatus | 'all';
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
  assignedStaff?: string;
  isPublic?: boolean;
}

export interface EventAnalytics {
  eventId: string;
  totalRegistrations: number;
  actualAttendance: number;
  attendanceRate: number;
  adoptionsFromEvent: number;
  fundsRaised?: number;
  volunteerHours?: number;
  feedbackScore?: number;
  demographics?: {
    newVisitors: number;
    returningVisitors: number;
  };
}

export interface EventCalendarDay {
  date: Date;
  events: Event[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

export type CalendarView = 'month' | 'week' | 'day' | 'list';
