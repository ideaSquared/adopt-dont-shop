import React from 'react';
import { Event, EventType } from '../../types/events';
import { formatDate, formatTime } from '@adopt-dont-shop/lib.utils';
import StatusBadge from '../common/StatusBadge';
import * as styles from './EventCard.css';

interface EventCardProps {
  event: Event;
  onClick?: (event: Event) => void;
}

const getEventTypeIcon = (type: EventType): string => {
  switch (type) {
    case 'adoption':
      return '🐾';
    case 'fundraising':
      return '💰';
    case 'volunteer':
      return '🤝';
    case 'community':
      return '🌟';
    default:
      return '📅';
  }
};

const getEventTypeLabel = (type: EventType): string => {
  switch (type) {
    case 'adoption':
      return 'Adoption Event';
    case 'fundraising':
      return 'Fundraising';
    case 'volunteer':
      return 'Volunteer Event';
    case 'community':
      return 'Community Outreach';
    default:
      return 'Event';
  }
};

const getTypeVariant = (
  type: EventType
): 'adoption' | 'fundraising' | 'volunteer' | 'community' | 'default' => {
  const validTypes = ['adoption', 'fundraising', 'volunteer', 'community'] as const;
  return (validTypes as readonly string[]).includes(type)
    ? (type as 'adoption' | 'fundraising' | 'volunteer' | 'community')
    : 'default';
};

const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(event);
    }
  };

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isSameDay = startDate.toDateString() === endDate.toDateString();

  return (
    <div
      className={styles.card}
      onClick={handleClick}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      role="button"
      tabIndex={0}
    >
      <div className={styles.eventHeader}>
        <div style={{ flex: 1 }}>
          <h3 className={styles.eventTitle}>{event.name}</h3>
          <span className={styles.eventTypeBadge({ type: getTypeVariant(event.type) })}>
            {getEventTypeIcon(event.type)} {getEventTypeLabel(event.type)}
          </span>
        </div>
        <StatusBadge status={event.status} />
      </div>

      <p className={styles.eventDescription}>{event.description}</p>

      <div className={styles.eventDetails}>
        <div className={styles.eventDetail}>
          <span>📅</span>
          <span>
            {formatDate(startDate)}
            {!isSameDay && ` - ${formatDate(endDate)}`}
          </span>
        </div>

        <div className={styles.eventDetail}>
          <span>🕐</span>
          <span>
            {formatTime(startDate)} - {formatTime(endDate)}
          </span>
        </div>

        <div className={styles.eventDetail}>
          <span>{event.location.type === 'virtual' ? '💻' : '📍'}</span>
          <span>
            {event.location.type === 'virtual'
              ? 'Virtual Event'
              : event.location.venue ||
                `${event.location.address}, ${event.location.city}` ||
                'Location TBD'}
          </span>
        </div>
      </div>

      <div className={styles.eventFooter}>
        {event.registrationRequired && event.capacity && (
          <div className={styles.attendanceInfo}>
            <span>👥</span>
            <span>
              <strong>{event.currentAttendance || 0}</strong> / {event.capacity} registered
            </span>
          </div>
        )}
        {event.assignedStaff && event.assignedStaff.length > 0 && (
          <div className={styles.attendanceInfo}>
            <span>👤</span>
            <span>{event.assignedStaff.length} staff assigned</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
