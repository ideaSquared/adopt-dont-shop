import React from 'react';
import { Event } from '../../types/events';
import EventCard from './EventCard';
import * as styles from './EventList.css';

interface EventListProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  loading?: boolean;
  emptyMessage?: string;
}

const EventList: React.FC<EventListProps> = ({
  events,
  onEventClick,
  loading = false,
  emptyMessage = 'No events found. Create your first event to get started!',
}) => {
  if (loading) {
    return (
      <div className={styles.listContainer}>
        <div className={styles.loadingState}>Loading events...</div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className={styles.listContainer}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📅</div>
          <h3 className={styles.emptyStateTitle}>No Events Yet</h3>
          <p className={styles.emptyStateText}>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.listContainer}>
      <div className={styles.eventGrid}>
        {events.map(event => (
          <EventCard key={event.id} event={event} onClick={onEventClick} />
        ))}
      </div>
    </div>
  );
};

export default EventList;
