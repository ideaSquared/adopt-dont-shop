import React from 'react';
import styled from 'styled-components';
import { Event, EventType } from '../../types/events';
import { formatDate, formatTime } from '@adopt-dont-shop/lib.utils';
import StatusBadge from '../common/StatusBadge';

interface EventCardProps {
  event: Event;
  onClick?: (event: Event) => void;
}

const Card = styled.div`
  background: white;
  border: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
    border-color: ${props => props.theme.colors.primary?.[300] || '#93c5fd'};
  }
`;

const EventHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const EventTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.text?.primary || '#111827'};
`;

const EventTypeBadge = styled.span<{ $type: EventType }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 9999px;
  white-space: nowrap;

  ${props => {
    switch (props.$type) {
      case 'adoption':
        return `
          background: #dbeafe;
          color: #1e40af;
        `;
      case 'fundraising':
        return `
          background: #dcfce7;
          color: #166534;
        `;
      case 'volunteer':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case 'community':
        return `
          background: #e9d5ff;
          color: #6b21a8;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
        `;
    }
  }}
`;

const EventDescription = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const EventDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const EventDetail = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${props => props.theme.text?.secondary || '#6b7280'};

  span:first-child {
    font-size: 1rem;
  }
`;

const EventFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
`;

const AttendanceInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${props => props.theme.text?.secondary || '#6b7280'};

  strong {
    color: ${props => props.theme.text?.primary || '#111827'};
  }
`;

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
    <Card onClick={handleClick}>
      <EventHeader>
        <div style={{ flex: 1 }}>
          <EventTitle>{event.name}</EventTitle>
          <EventTypeBadge $type={event.type}>
            {getEventTypeIcon(event.type)} {getEventTypeLabel(event.type)}
          </EventTypeBadge>
        </div>
        <StatusBadge status={event.status} />
      </EventHeader>

      <EventDescription>{event.description}</EventDescription>

      <EventDetails>
        <EventDetail>
          <span>📅</span>
          <span>
            {formatDate(startDate)}
            {!isSameDay && ` - ${formatDate(endDate)}`}
          </span>
        </EventDetail>

        <EventDetail>
          <span>🕐</span>
          <span>
            {formatTime(startDate)} - {formatTime(endDate)}
          </span>
        </EventDetail>

        <EventDetail>
          <span>{event.location.type === 'virtual' ? '💻' : '📍'}</span>
          <span>
            {event.location.type === 'virtual'
              ? 'Virtual Event'
              : event.location.venue ||
                `${event.location.address}, ${event.location.city}` ||
                'Location TBD'}
          </span>
        </EventDetail>
      </EventDetails>

      <EventFooter>
        {event.registrationRequired && event.capacity && (
          <AttendanceInfo>
            <span>👥</span>
            <span>
              <strong>{event.currentAttendance || 0}</strong> / {event.capacity} registered
            </span>
          </AttendanceInfo>
        )}
        {event.assignedStaff && event.assignedStaff.length > 0 && (
          <AttendanceInfo>
            <span>👤</span>
            <span>{event.assignedStaff.length} staff assigned</span>
          </AttendanceInfo>
        )}
      </EventFooter>
    </Card>
  );
};

export default EventCard;
