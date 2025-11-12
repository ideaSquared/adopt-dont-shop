import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card } from '@adopt-dont-shop/components';
import { FiCalendar, FiPlus } from 'react-icons/fi';

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

const PageContainer = styled.div`
  max-width: 100%;
  margin: 0;
  padding: 0;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const HeaderTitle = styled.div`
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: ${props => props.theme.text.primary};
    margin: 0 0 0.5rem 0;
  }

  p {
    font-size: 1rem;
    color: ${props => props.theme.text.secondary};
    margin: 0;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    width: 100%;

    > button {
      flex: 1;
    }
  }
`;

const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: ${props => props.theme.colors.primary[600]};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary[700]};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }

  svg {
    font-size: 1.125rem;
  }

  &:disabled {
    background: ${props => props.theme.colors.neutral[300]};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.semantic.error[600]};
  background: ${props => props.theme.colors.semantic.error[50]};
  border: 1px solid ${props => props.theme.colors.semantic.error[200]};
  border-radius: 8px;
  margin-bottom: 1.5rem;

  p {
    margin: 0;
  }
`;

const Modal = styled.div<{ $isOpen: boolean }>`
  display: ${props => (props.$isOpen ? 'flex' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow-y: auto;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  margin: 2rem auto;
`;

const ModalHeader = styled.div`
  position: sticky;
  top: 0;
  background: white;
  padding: 1.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.neutral[200]};
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
  border-radius: 12px 12px 0 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.text.primary};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${props => props.theme.text.secondary};
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.text.primary};
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${props => props.theme.text.secondary};

  svg {
    font-size: 3rem;
    color: ${props => props.theme.colors.neutral[300]};
    margin-bottom: 1rem;
  }

  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: ${props => props.theme.text.primary};
    margin: 0 0 0.5rem 0;
  }

  p {
    margin: 0 0 1.5rem 0;
  }
`;

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
    if (!eventToEdit) return;

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
    if (!selectedEvent) return;

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
      <PageContainer>
        <PageHeader>
          <HeaderTitle>
            <h1>Event Management</h1>
          </HeaderTitle>
        </PageHeader>
        <ErrorState>
          <p>{error}</p>
        </ErrorState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <HeaderTop>
          <HeaderTitle>
            <h1>Event Management</h1>
            <p>Plan and coordinate adoption events, fundraisers, and volunteer activities</p>
          </HeaderTitle>

          <HeaderActions>
            <PrimaryButton onClick={() => setShowCreateModal(true)} disabled={loading}>
              <FiPlus />
              Create Event
            </PrimaryButton>
          </HeaderActions>
        </HeaderTop>

        <EventFilters
          filters={filters}
          onFiltersChange={setFilters}
          view={view}
          onViewChange={setView}
        />
      </PageHeader>

      <ContentArea>
        {loading ? (
          <Card>
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <p>Loading events...</p>
            </div>
          </Card>
        ) : filteredEvents.length === 0 && !loading ? (
          <Card>
            <EmptyState>
              <FiCalendar />
              <h3>No Events Found</h3>
              <p>
                {events.length === 0
                  ? "You haven't created any events yet. Get started by creating your first event!"
                  : 'No events match your current filters. Try adjusting your search criteria.'}
              </p>
              {events.length === 0 && (
                <PrimaryButton onClick={() => setShowCreateModal(true)}>
                  <FiPlus />
                  Create Your First Event
                </PrimaryButton>
              )}
            </EmptyState>
          </Card>
        ) : view === 'list' ? (
          <EventList events={filteredEvents} onEventClick={handleEventClick} loading={loading} />
        ) : (
          <EventCalendar events={filteredEvents} onEventClick={handleEventClick} />
        )}
      </ContentArea>

      {/* Create Event Modal */}
      <Modal $isOpen={showCreateModal} onClick={() => handleCloseModal('create')}>
        <ModalContent onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>Create New Event</ModalTitle>
            <CloseButton onClick={() => handleCloseModal('create')}>&times;</CloseButton>
          </ModalHeader>
          <ModalBody>
            <EventForm
              onSubmit={handleCreateEvent}
              onCancel={() => handleCloseModal('create')}
              isEditing={false}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Edit Event Modal */}
      <Modal $isOpen={showEditModal} onClick={() => handleCloseModal('edit')}>
        <ModalContent onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>Edit Event</ModalTitle>
            <CloseButton onClick={() => handleCloseModal('edit')}>&times;</CloseButton>
          </ModalHeader>
          <ModalBody>
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
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Event Details Modal */}
      <Modal $isOpen={showDetailsModal} onClick={() => handleCloseModal('details')}>
        <ModalContent onClick={e => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>Event Details</ModalTitle>
            <CloseButton onClick={() => handleCloseModal('details')}>&times;</CloseButton>
          </ModalHeader>
          <ModalBody>
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
          </ModalBody>
        </ModalContent>
      </Modal>
    </PageContainer>
  );
};

export default Events;
