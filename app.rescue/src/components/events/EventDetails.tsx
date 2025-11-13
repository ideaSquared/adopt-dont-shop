import React, { useState } from 'react';
import styled from 'styled-components';
import { Event, EventAttendee } from '../../types/events';
import { formatDate, formatTime } from '@adopt-dont-shop/lib.utils';
import StatusBadge from '../common/StatusBadge';
import AttendeeList from './AttendeeList';

interface EventDetailsProps {
  event: Event;
  attendees?: EventAttendee[];
  onEdit?: () => void;
  onDelete?: () => void;
  onUpdateStatus?: (status: string) => void;
  onCheckInAttendee?: (userId: string) => void;
}

const DetailsContainer = styled.div`
  background: white;
  border-radius: 12px;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 2rem;
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.primary?.[50] || '#eff6ff'} 0%,
    ${props => props.theme.colors.primary?.[100] || '#dbeafe'} 100%
  );
  border-bottom: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text?.primary || '#111827'};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: ${props.theme.colors.primary?.[600] || '#2563eb'};
          color: white;
          &:hover {
            background: ${props.theme.colors.primary?.[700] || '#1d4ed8'};
          }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover {
            background: #dc2626;
          }
        `;
      default:
        return `
          background: white;
          color: ${props.theme.text?.primary || '#111827'};
          border: 1px solid ${props.theme.colors.neutral?.[300] || '#d1d5db'};
          &:hover {
            background: ${props.theme.colors.neutral?.[100] || '#f3f4f6'};
          }
        `;
    }
  }}
`;

const MetaInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  span:first-child {
    font-size: 1rem;
  }
`;

const Body = styled.div`
  padding: 2rem;
`;

const Section = styled.div`
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${props => props.theme.text?.primary || '#111827'};
`;

const Description = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
`;

const InfoCard = styled.div`
  padding: 1rem;
  background: ${props => props.theme.colors.neutral?.[50] || '#f9fafb'};
  border: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
  border-radius: 8px;
`;

const InfoLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-bottom: 0.5rem;
`;

const InfoValue = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.text?.primary || '#111827'};
`;

const StatusSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${props => props.theme.colors.neutral?.[300] || '#d1d5db'};
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary?.[500] || '#3b82f6'};
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
`;

const ProgressFill = styled.div<{ $percentage: number }>`
  height: 100%;
  width: ${props => props.$percentage}%;
  background: ${props => props.theme.colors.primary?.[600] || '#2563eb'};
  transition: width 0.3s ease;
`;

const EventDetails: React.FC<EventDetailsProps> = ({
  event,
  attendees,
  onEdit,
  onDelete,
  onUpdateStatus,
  onCheckInAttendee,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(event.status);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setSelectedStatus(newStatus);
    if (onUpdateStatus) {
      onUpdateStatus(newStatus);
    }
  };

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isSameDay = startDate.toDateString() === endDate.toDateString();

  const attendancePercentage =
    event.capacity && event.currentAttendance
      ? (event.currentAttendance / event.capacity) * 100
      : 0;

  return (
    <DetailsContainer>
      <Header>
        <HeaderTop>
          <div>
            <Title>{event.name}</Title>
            <StatusBadge status={event.status} />
          </div>
          <HeaderActions>
            {onEdit && (
              <Button $variant="secondary" onClick={onEdit}>
                ✏️ Edit
              </Button>
            )}
            {onDelete && (
              <Button $variant="danger" onClick={onDelete}>
                🗑️ Delete
              </Button>
            )}
          </HeaderActions>
        </HeaderTop>

        <MetaInfo>
          <MetaItem>
            <span>📅</span>
            <span>
              {formatDate(startDate)}
              {!isSameDay && ` - ${formatDate(endDate)}`}
            </span>
          </MetaItem>
          <MetaItem>
            <span>🕐</span>
            <span>
              {formatTime(startDate)} - {formatTime(endDate)}
            </span>
          </MetaItem>
          <MetaItem>
            <span>{event.location.type === 'virtual' ? '💻' : '📍'}</span>
            <span>
              {event.location.type === 'virtual'
                ? 'Virtual Event'
                : event.location.venue ||
                  `${event.location.address}, ${event.location.city}` ||
                  'Location TBD'}
            </span>
          </MetaItem>
        </MetaInfo>
      </Header>

      <Body>
        <Section>
          <SectionTitle>Description</SectionTitle>
          <Description>{event.description}</Description>
        </Section>

        <Section>
          <SectionTitle>Event Information</SectionTitle>
          <InfoGrid>
            <InfoCard>
              <InfoLabel>Event Type</InfoLabel>
              <InfoValue>{event.type.replace('_', ' ').toUpperCase()}</InfoValue>
            </InfoCard>

            <InfoCard>
              <InfoLabel>Status</InfoLabel>
              {onUpdateStatus ? (
                <StatusSelect value={selectedStatus} onChange={handleStatusChange}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </StatusSelect>
              ) : (
                <InfoValue>{event.status.replace('_', ' ').toUpperCase()}</InfoValue>
              )}
            </InfoCard>

            <InfoCard>
              <InfoLabel>Visibility</InfoLabel>
              <InfoValue>{event.isPublic ? 'Public' : 'Private'}</InfoValue>
            </InfoCard>

            {event.capacity && (
              <InfoCard>
                <InfoLabel>Capacity</InfoLabel>
                <InfoValue>
                  {event.currentAttendance || 0} / {event.capacity} registered
                </InfoValue>
                <ProgressBar>
                  <ProgressFill $percentage={attendancePercentage} />
                </ProgressBar>
              </InfoCard>
            )}
          </InfoGrid>
        </Section>

        {event.location.type === 'physical' && (
          <Section>
            <SectionTitle>Location Details</SectionTitle>
            <InfoGrid>
              {event.location.venue && (
                <InfoCard>
                  <InfoLabel>Venue</InfoLabel>
                  <InfoValue>{event.location.venue}</InfoValue>
                </InfoCard>
              )}
              {event.location.address && (
                <InfoCard>
                  <InfoLabel>Address</InfoLabel>
                  <InfoValue>
                    {event.location.address}
                    <br />
                    {event.location.city} {event.location.postcode}
                  </InfoValue>
                </InfoCard>
              )}
            </InfoGrid>
          </Section>
        )}

        {event.location.type === 'virtual' && event.location.virtualLink && (
          <Section>
            <SectionTitle>Virtual Meeting Link</SectionTitle>
            <InfoCard>
              <InfoValue>
                <a
                  href={event.location.virtualLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb', textDecoration: 'underline' }}
                >
                  {event.location.virtualLink}
                </a>
              </InfoValue>
            </InfoCard>
          </Section>
        )}

        {event.registrationRequired && attendees && (
          <Section>
            <SectionTitle>
              Attendees ({attendees.length}
              {event.capacity && ` / ${event.capacity}`})
            </SectionTitle>
            <AttendeeList attendees={attendees} onCheckIn={onCheckInAttendee} />
          </Section>
        )}
      </Body>
    </DetailsContainer>
  );
};

export default EventDetails;
