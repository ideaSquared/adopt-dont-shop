import React from 'react';
import styled from 'styled-components';
import { TimelineEvent, TimelineEventType } from './ApplicationTimeline';
import { format } from 'date-fns';

interface TimelineWidgetProps {
  events: TimelineEvent[];
  maxEvents?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const WidgetContainer = styled.div`
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
`;

const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const WidgetTitle = styled.h4`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`;

const ViewAllButton = styled.button`
  padding: 0.25rem 0.5rem;
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
  cursor: pointer;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const CompactEventList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CompactEvent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem;
  background: white;
  border-radius: 0.25rem;
  border: 1px solid #e5e7eb;
`;

const EventIcon = styled.div<{ eventType: TimelineEventType }>`
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  color: white;
  background: ${props => getEventColor(props.eventType)};
`;

const EventInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const EventTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EventTime = styled.div`
  font-size: 0.625rem;
  color: #6b7280;
  margin-top: 0.125rem;
`;

const SystemIndicator = styled.span`
  flex-shrink: 0;
  font-size: 0.5rem;
  color: #9ca3af;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 1rem;
  color: #6b7280;
  font-size: 0.75rem;
`;

function getEventColor(eventType: TimelineEventType): string {
  const colors: Record<TimelineEventType, string> = {
    [TimelineEventType.STAGE_CHANGE]: '#3b82f6',
    [TimelineEventType.STATUS_UPDATE]: '#8b5cf6',
    [TimelineEventType.NOTE_ADDED]: '#10b981',
    [TimelineEventType.REFERENCE_CONTACTED]: '#f59e0b',
    [TimelineEventType.REFERENCE_VERIFIED]: '#10b981',
    [TimelineEventType.INTERVIEW_SCHEDULED]: '#8b5cf6',
    [TimelineEventType.INTERVIEW_COMPLETED]: '#10b981',
    [TimelineEventType.HOME_VISIT_SCHEDULED]: '#f59e0b',
    [TimelineEventType.HOME_VISIT_COMPLETED]: '#10b981',
    [TimelineEventType.HOME_VISIT_RESCHEDULED]: '#f59e0b',
    [TimelineEventType.HOME_VISIT_CANCELLED]: '#ef4444',
    [TimelineEventType.SCORE_UPDATED]: '#8b5cf6',
    [TimelineEventType.DOCUMENT_UPLOADED]: '#06b6d4',
    [TimelineEventType.DECISION_MADE]: '#8b5cf6',
    [TimelineEventType.APPLICATION_APPROVED]: '#10b981',
    [TimelineEventType.APPLICATION_REJECTED]: '#ef4444',
    [TimelineEventType.APPLICATION_WITHDRAWN]: '#6b7280',
    [TimelineEventType.APPLICATION_REOPENED]: '#3b82f6',
    [TimelineEventType.COMMUNICATION_SENT]: '#06b6d4',
    [TimelineEventType.COMMUNICATION_RECEIVED]: '#06b6d4',
    [TimelineEventType.SYSTEM_AUTO_PROGRESSION]: '#6b7280',
    [TimelineEventType.MANUAL_OVERRIDE]: '#f59e0b',
  };
  
  return colors[eventType] || '#6b7280';
}

function getEventIcon(eventType: TimelineEventType): string {
  const icons: Record<TimelineEventType, string> = {
    [TimelineEventType.STAGE_CHANGE]: '🔄',
    [TimelineEventType.STATUS_UPDATE]: '📊',
    [TimelineEventType.NOTE_ADDED]: '📝',
    [TimelineEventType.REFERENCE_CONTACTED]: '📞',
    [TimelineEventType.REFERENCE_VERIFIED]: '✅',
    [TimelineEventType.INTERVIEW_SCHEDULED]: '📅',
    [TimelineEventType.INTERVIEW_COMPLETED]: '✅',
    [TimelineEventType.HOME_VISIT_SCHEDULED]: '🏠',
    [TimelineEventType.HOME_VISIT_COMPLETED]: '✅',
    [TimelineEventType.HOME_VISIT_RESCHEDULED]: '📅',
    [TimelineEventType.HOME_VISIT_CANCELLED]: '❌',
    [TimelineEventType.SCORE_UPDATED]: '⭐',
    [TimelineEventType.DOCUMENT_UPLOADED]: '📄',
    [TimelineEventType.DECISION_MADE]: '⚖️',
    [TimelineEventType.APPLICATION_APPROVED]: '✅',
    [TimelineEventType.APPLICATION_REJECTED]: '❌',
    [TimelineEventType.APPLICATION_WITHDRAWN]: '🚫',
    [TimelineEventType.APPLICATION_REOPENED]: '🔄',
    [TimelineEventType.COMMUNICATION_SENT]: '📤',
    [TimelineEventType.COMMUNICATION_RECEIVED]: '📥',
    [TimelineEventType.SYSTEM_AUTO_PROGRESSION]: '🤖',
    [TimelineEventType.MANUAL_OVERRIDE]: '⚙️',
  };
  
  return icons[eventType] || '📋';
}

export const TimelineWidget: React.FC<TimelineWidgetProps> = ({
  events,
  maxEvents = 3,
  showViewAll = true,
  onViewAll,
}) => {
  const displayEvents = events.slice(0, maxEvents);
  const hasMoreEvents = events.length > maxEvents;

  if (events.length === 0) {
    return (
      <WidgetContainer>
        <WidgetHeader>
          <WidgetTitle>Recent Activity</WidgetTitle>
        </WidgetHeader>
        <EmptyState>
          No activity yet
        </EmptyState>
      </WidgetContainer>
    );
  }

  return (
    <WidgetContainer>
      <WidgetHeader>
        <WidgetTitle>Recent Activity</WidgetTitle>
        {showViewAll && onViewAll && (hasMoreEvents || events.length > 0) && (
          <ViewAllButton onClick={onViewAll}>
            View All ({events.length})
          </ViewAllButton>
        )}
      </WidgetHeader>
      
      <CompactEventList>
        {displayEvents.map((event) => (
          <CompactEvent key={event.timeline_id}>
            <EventIcon eventType={event.event_type}>
              {getEventIcon(event.event_type)}
            </EventIcon>
            
            <EventInfo>
              <EventTitle>{event.title}</EventTitle>
              <EventTime>
                {format(new Date(event.created_at), 'MMM d, h:mm a')}
              </EventTime>
            </EventInfo>
            
            {event.created_by_system && (
              <SystemIndicator title="Automated event">
                🤖
              </SystemIndicator>
            )}
          </CompactEvent>
        ))}
      </CompactEventList>
    </WidgetContainer>
  );
};
