import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Card,
  CardContent,
  Heading,
  Text,
  Button,
  Container,
  Badge,
  Input,
} from '@adopt-dont-shop/components';
import { usePermissions } from '@/contexts/PermissionsContext';
import { 
  FiCalendar, 
  FiPlus, 
  FiMapPin, 
  FiClock,
  FiUsers,
  FiEdit3,
  FiTrash2,
  FiSearch
} from 'react-icons/fi';

// Styled Components
const EventsContainer = styled(Container)`
  max-width: 1400px;
  padding: 2rem 1rem;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FiltersSection = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  align-items: center;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
`;

const SearchIcon = styled(FiSearch)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  z-index: 1;
`;

const SearchInput = styled(Input)`
  padding-left: 40px;
`;

const EventsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const EventCard = styled(Card)`
  transition: all 0.2s ease-in-out;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const EventHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const EventInfo = styled.div`
  flex: 1;
`;

const EventMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  font-size: 0.875rem;
`;

const EventTypeBadge = styled(Badge)<{ $eventType: string }>`
  ${props => {
    switch (props.$eventType) {
      case 'adoption':
        return 'background-color: #10B981; color: white;';
      case 'fundraising':
        return 'background-color: #8B5CF6; color: white;';
      case 'volunteer':
        return 'background-color: #3B82F6; color: white;';
      case 'training':
        return 'background-color: #F59E0B; color: white;';
      default:
        return 'background-color: #6B7280; color: white;';
    }
  }}
`;

const EventActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const ActionButton = styled(Button)`
  padding: 0.5rem;
  min-width: auto;
`;

// Event interface
interface Event {
  id: string;
  title: string;
  description: string;
  type: 'adoption' | 'fundraising' | 'volunteer' | 'training';
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  maxAttendees?: number;
  currentAttendees: number;
  organizerId: string;
  isPublic: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

// Mock data for development
const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Weekend Adoption Event',
    description: 'Meet and greet with available pets for adoption. Perfect opportunity for families to find their new companion.',
    type: 'adoption',
    date: new Date('2025-02-15'),
    startTime: '10:00 AM',
    endTime: '4:00 PM',
    location: 'Central Park Pavilion',
    maxAttendees: 50,
    currentAttendees: 23,
    organizerId: 'staff1',
    isPublic: true,
    status: 'upcoming'
  },
  {
    id: '2',
    title: 'Volunteer Training Session',
    description: 'Training session for new volunteers on animal handling and rescue procedures.',
    type: 'training',
    date: new Date('2025-02-08'),
    startTime: '2:00 PM',
    endTime: '5:00 PM',
    location: 'Rescue Training Center',
    maxAttendees: 15,
    currentAttendees: 8,
    organizerId: 'staff2',
    isPublic: false,
    status: 'upcoming'
  },
  {
    id: '3',
    title: 'Charity Fundraising Gala',
    description: 'Annual fundraising gala to support rescue operations and animal care.',
    type: 'fundraising',
    date: new Date('2025-03-01'),
    startTime: '6:00 PM',
    endTime: '11:00 PM',
    location: 'Grand Hotel Ballroom',
    maxAttendees: 200,
    currentAttendees: 156,
    organizerId: 'staff1',
    isPublic: true,
    status: 'upcoming'
  }
];

/**
 * EventsPage component for managing rescue events
 * Handles adoption events, fundraising, volunteer training, and coordination
 */
export const EventsPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('upcoming');

  // In production, this would fetch from the service
  const events = mockEvents.filter(event => {
    const matchesSearch = !searchTerm || 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreateEvent = () => {
    // Open create event modal
    console.log('Create new event');
  };

  const handleEditEvent = (eventId: string) => {
    // Open edit event modal
    console.log('Edit event:', eventId);
  };

  const handleDeleteEvent = (eventId: string) => {
    // Delete event with confirmation
    console.log('Delete event:', eventId);
  };

  const handleViewEvent = (eventId: string) => {
    // Navigate to event details
    console.log('View event:', eventId);
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'adoption':
        return <FiCalendar />;
      case 'fundraising':
        return <FiUsers />;
      case 'volunteer':
        return <FiUsers />;
      case 'training':
        return <FiUsers />;
      default:
        return <FiCalendar />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <EventsContainer>
      <HeaderSection>
        <div>
          <Heading level="h1">Event Management</Heading>
          <Text color="muted">Plan and coordinate rescue events, adoption events, and volunteer activities</Text>
        </div>
        
        {hasPermission('admin.dashboard') && (
          <Button onClick={handleCreateEvent}>
            <FiPlus style={{ marginRight: '0.5rem' }} />
            Create Event
          </Button>
        )}
      </HeaderSection>

      <FiltersSection>
        <SearchContainer>
          <SearchIcon />
          <SearchInput
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        >
          <option value="all">All Types</option>
          <option value="adoption">Adoption Events</option>
          <option value="fundraising">Fundraising</option>
          <option value="volunteer">Volunteer Events</option>
          <option value="training">Training</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}
        >
          <option value="upcoming">Upcoming</option>
          <option value="all">All Status</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </FiltersSection>

      <EventsGrid>
        {events.map((event) => (
          <EventCard key={event.id} onClick={() => handleViewEvent(event.id)}>
            <CardContent>
              <EventHeader>
                <EventInfo>
                  <Heading level="h4">{event.title}</Heading>
                  <EventTypeBadge $eventType={event.type}>
                    {getEventTypeIcon(event.type)}
                    {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                  </EventTypeBadge>
                </EventInfo>
                
                {hasPermission('admin.dashboard') && (
                  <EventActions>
                    <ActionButton
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditEvent(event.id);
                      }}
                      title="Edit Event"
                    >
                      <FiEdit3 />
                    </ActionButton>
                    {hasPermission('admin.dashboard') && (
                      <ActionButton
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id);
                        }}
                        title="Delete Event"
                      >
                        <FiTrash2 />
                      </ActionButton>
                    )}
                  </EventActions>
                )}
              </EventHeader>

              <Text color="muted" size="sm" style={{ marginBottom: '1rem' }}>
                {event.description}
              </Text>

              <EventMeta>
                <MetaItem>
                  <FiCalendar />
                  <span>{formatDate(event.date)}</span>
                </MetaItem>
                
                <MetaItem>
                  <FiClock />
                  <span>{event.startTime} - {event.endTime}</span>
                </MetaItem>
                
                <MetaItem>
                  <FiMapPin />
                  <span>{event.location}</span>
                </MetaItem>
                
                {event.maxAttendees && (
                  <MetaItem>
                    <FiUsers />
                    <span>{event.currentAttendees}/{event.maxAttendees} attendees</span>
                  </MetaItem>
                )}
              </EventMeta>
            </CardContent>
          </EventCard>
        ))}
        
        {events.length === 0 && (
          <Card style={{ gridColumn: '1 / -1' }}>
            <CardContent style={{ textAlign: 'center', padding: '3rem' }}>
              <Heading level="h3">No Events Found</Heading>
              <Text color="muted">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'upcoming'
                  ? 'Try adjusting your search or filters'
                  : 'No events scheduled yet'
                }
              </Text>
              {hasPermission('admin.dashboard') && (
                <Button 
                  onClick={handleCreateEvent}
                  style={{ marginTop: '1rem' }}
                >
                  <FiPlus style={{ marginRight: '0.5rem' }} />
                  Create Your First Event
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </EventsGrid>
    </EventsContainer>
  );
};
