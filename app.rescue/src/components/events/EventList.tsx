import React from 'react';
import styled from 'styled-components';
import { Event } from '../../types/events';
import EventCard from './EventCard';

interface EventListProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  loading?: boolean;
  emptyMessage?: string;
}

const ListContainer = styled.div`
  width: 100%;
`;

const EventGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  font-size: 1rem;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;

  .icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: ${props => props.theme.text?.primary || '#111827'};
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    color: ${props => props.theme.text?.secondary || '#6b7280'};
  }
`;

const EventList: React.FC<EventListProps> = ({
  events,
  onEventClick,
  loading = false,
  emptyMessage = 'No events found. Create your first event to get started!',
}) => {
  if (loading) {
    return (
      <ListContainer>
        <LoadingState>Loading events...</LoadingState>
      </ListContainer>
    );
  }

  if (!events || events.length === 0) {
    return (
      <ListContainer>
        <EmptyState>
          <div className="icon">📅</div>
          <h3>No Events Yet</h3>
          <p>{emptyMessage}</p>
        </EmptyState>
      </ListContainer>
    );
  }

  return (
    <ListContainer>
      <EventGrid>
        {events.map(event => (
          <EventCard key={event.id} event={event} onClick={onEventClick} />
        ))}
      </EventGrid>
    </ListContainer>
  );
};

export default EventList;
