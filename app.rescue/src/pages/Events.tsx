import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { Card } from '@adopt-dont-shop/lib.components';
import { FiCalendar, FiPlus } from 'react-icons/fi';
import * as styles from './Events.css';

// Event Components
import EventList from '../components/events/EventList';
import EventFilters from '../components/events/EventFilters';
import EventForm from '../components/events/EventForm';
import EventDetails from '../components/events/EventDetails';
import EventCalendar from '../components/events/EventCalendar';

// Services
import { eventsService } from '../services/eventsService';

// Types
import {
  Event,
  CreateEventInput,
  UpdateEventInput,
  EventFilter,
  CalendarView,
  EventAttendee,
} from '../types/events';

const Events: React.FC = () => {
  // State for events data
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventAttendees, setEventAttendees] = useState<EventAttendee[]>([]);

  // State for filters and view
  const [filters, setFilters] = useState<EventFilter>({
    type: 'all',
    status: 'all',
    searchQuery: '',
  });
  const [view, setView] = useState<CalendarView>('list');

  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

  // State for loading and errors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch events on mount and when filters change
  useEffect(() => {
    fetchEvents();
  }, []);

  // Apply filters whenever events or filters change
  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  /**
   * Fetch events from the API
   */
  const fetchEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedEvents = await eventsService.getEvents();
      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply filters to events
   */
  const applyFilters = () => {
    let filtered = [...events];

    // Filter by type
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(event => event.type === filters.type);
    }

    // Filter by status
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(event => event.status === filters.status);
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        event =>
          event.name.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query)
      );
    }

    // Filter by date range
    if (filters.dateRange) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.startDate);
        return eventDate >= filters.dateRange!.start && eventDate <= filters.dateRange!.end;
      });
    }

    // Filter by assigned staff
    if (filters.assignedStaff) {
      filtered = filtered.filter(event => event.assignedStaff?.includes(filters.assignedStaff!));
    }

    // Filter by public/private
    if (filters.isPublic !== undefined) {
      filtered = filtered.filter(event => event.isPublic === filters.isPublic);
    }

    setFilteredEvents(filtered);
  };

  /**
   * Handle event creation
   */
  const handleCreateEvent = async (eventData: CreateEventInput) => {
    try {
      const newEvent = await eventsService.createEvent(eventData);
      setEvents(prev => [newEvent, ...prev]);
      setShowCreateModal(false);
      // Show success message (you could add a toast notification here)
      console.log('Event created successfully:', newEvent);
    } catch (err) {
      console.error('Failed to create event:', err);
      alert('Failed to create event. Please try again.');
    }
  };

  /**
   * Handle event update
   */
  const handleUpdateEvent = async (eventData: CreateEventInput) => {
    if (!eventToEdit) {
      return;
    }

    try {
      const updates: UpdateEventInput = {
        ...eventData,
      };
      const updatedEvent = await eventsService.updateEvent(eventToEdit.id, updates);
      setEvents(prev => prev.map(event => (event.id === updatedEvent.id ? updatedEvent : event)));
      setShowEditModal(false);
      setEventToEdit(null);

      // Update selected event if it's being viewed
      if (selectedEvent?.id === updatedEvent.id) {
        setSelectedEvent(updatedEvent);
      }

      console.log('Event updated successfully:', updatedEvent);
    } catch (err) {
      console.error('Failed to update event:', err);
      alert('Failed to update event. Please try again.');
    }
  };

  /**
   * Handle event deletion
   */
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      await eventsService.deleteEvent(eventId);
      setEvents(prev => prev.filter(event => event.id !== eventId));
      setShowDetailsModal(false);
      setSelectedEvent(null);
      console.log('Event deleted successfully');
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Failed to delete event. Please try again.');
    }
  };

  /**
   * Handle event status update
   */
  const handleUpdateEventStatus = async (eventId: string, status: string) => {
    try {
      const updatedEvent = await eventsService.updateEventStatus(eventId, status);
      setEvents(prev => prev.map(event => (event.id === updatedEvent.id ? updatedEvent : event)));

      // Update selected event
      if (selectedEvent?.id === updatedEvent.id) {
        setSelectedEvent(updatedEvent);
      }

      console.log('Event status updated:', status);
    } catch (err) {
      console.error('Failed to update event status:', err);
      alert('Failed to update event status. Please try again.');
    }
  };

  /**
   * Handle event click - show details
   */
  const handleEventClick = async (event: Event) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);

    // Fetch attendees if registration is required
    if (event.registrationRequired) {
      try {
        const attendees = await eventsService.getEventAttendees(event.id);
        setEventAttendees(attendees);
      } catch (err) {
        console.error('Failed to fetch attendees:', err);
        setEventAttendees([]);
      }
    }
  };

  /**
   * Handle edit button click from details modal
   */
  const handleEditClick = () => {
    if (selectedEvent) {
      setEventToEdit(selectedEvent);
      setShowDetailsModal(false);
      setShowEditModal(true);
    }
  };

  /**
   * Handle attendee check-in
   */
  const handleCheckInAttendee = async (userId: string) => {
    if (!selectedEvent) {
      return;
    }

    try {
      await eventsService.checkInAttendee(selectedEvent.id, userId);
      // Refresh attendees list
      const updatedAttendees = await eventsService.getEventAttendees(selectedEvent.id);
      setEventAttendees(updatedAttendees);
      console.log('Attendee checked in successfully');
    } catch (err) {
      console.error('Failed to check in attendee:', err);
      alert('Failed to check in attendee. Please try again.');
    }
  };

  /**
   * Handle closing modals
   */
  const handleCloseModal = (modalType: 'create' | 'edit' | 'details') => {
    switch (modalType) {
      case 'create':
        setShowCreateModal(false);
        break;
      case 'edit':
        setShowEditModal(false);
        setEventToEdit(null);
        break;
      case 'details':
        setShowDetailsModal(false);
        setSelectedEvent(null);
        setEventAttendees([]);
        break;
    }
  };

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <div className={styles.headerTitle}>
            <h1>Event Management</h1>
          </div>
        </div>
        <div className={styles.errorState}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitle}>
            <h1>Event Management</h1>
            <p>Plan and coordinate adoption events, fundraisers, and volunteer activities</p>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.primaryButton}
              onClick={() => setShowCreateModal(true)}
              disabled={loading}
            >
              <FiPlus />
              Create Event
            </button>
          </div>
        </div>

        <EventFilters
          filters={filters}
          onFiltersChange={setFilters}
          view={view}
          onViewChange={setView}
        />
      </div>

      <div className={styles.contentArea}>
        {loading ? (
          <Card>
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p>Loading events...</p>
            </div>
          </Card>
        ) : filteredEvents.length === 0 && !loading ? (
          <Card>
            <div className={styles.emptyState}>
              <FiCalendar />
              <h3>No Events Found</h3>
              <p>
                {events.length === 0
                  ? "You haven't created any events yet. Get started by creating your first event!"
                  : 'No events match your current filters. Try adjusting your search criteria.'}
              </p>
              {events.length === 0 && (
                <button className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
                  <FiPlus />
                  Create Your First Event
                </button>
              )}
            </div>
          </Card>
        ) : view === 'list' ? (
          <EventList events={filteredEvents} onEventClick={handleEventClick} loading={loading} />
        ) : (
          <EventCalendar events={filteredEvents} onEventClick={handleEventClick} />
        )}
      </div>

      {/* Create Event Modal */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={clsx(styles.modal, showCreateModal ? styles.modalOpen : styles.modalClosed)}
        onClick={() => handleCloseModal('create')}
      >
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Create New Event</h2>
            <button className={styles.closeButton} onClick={() => handleCloseModal('create')}>
              &times;
            </button>
          </div>
          <div className={styles.modalBody}>
            <EventForm
              onSubmit={handleCreateEvent}
              onCancel={() => handleCloseModal('create')}
              isEditing={false}
            />
          </div>
        </div>
      </div>

      {/* Edit Event Modal */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={clsx(styles.modal, showEditModal ? styles.modalOpen : styles.modalClosed)}
        onClick={() => handleCloseModal('edit')}
      >
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Edit Event</h2>
            <button className={styles.closeButton} onClick={() => handleCloseModal('edit')}>
              &times;
            </button>
          </div>
          <div className={styles.modalBody}>
            {eventToEdit && (
              <EventForm
                initialData={{
                  name: eventToEdit.name,
                  description: eventToEdit.description,
                  type: eventToEdit.type,
                  startDate: eventToEdit.startDate,
                  endDate: eventToEdit.endDate,
                  location: eventToEdit.location,
                  capacity: eventToEdit.capacity,
                  registrationRequired: eventToEdit.registrationRequired,
                  featuredPets: eventToEdit.featuredPets,
                  assignedStaff: eventToEdit.assignedStaff,
                  isPublic: eventToEdit.isPublic,
                  imageUrl: eventToEdit.imageUrl,
                }}
                onSubmit={handleUpdateEvent}
                onCancel={() => handleCloseModal('edit')}
                isEditing={true}
              />
            )}
          </div>
        </div>
      </div>

      {/* Event Details Modal */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={clsx(styles.modal, showDetailsModal ? styles.modalOpen : styles.modalClosed)}
        onClick={() => handleCloseModal('details')}
      >
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Event Details</h2>
            <button className={styles.closeButton} onClick={() => handleCloseModal('details')}>
              &times;
            </button>
          </div>
          <div className={styles.modalBody}>
            {selectedEvent && (
              <EventDetails
                event={selectedEvent}
                attendees={eventAttendees}
                onEdit={handleEditClick}
                onDelete={() => handleDeleteEvent(selectedEvent.id)}
                onUpdateStatus={status => handleUpdateEventStatus(selectedEvent.id, status)}
                onCheckInAttendee={handleCheckInAttendee}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Events;
