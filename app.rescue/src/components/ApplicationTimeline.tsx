import React from 'react';
import styled from 'styled-components';
import { formatDateTime } from '@adopt-dont-shop/lib-utils';

// Timeline Event Types (matching backend)
export enum TimelineEventType {
  STAGE_CHANGE = 'stage_change',
  STATUS_UPDATE = 'status_update',
  NOTE_ADDED = 'note_added',
  REFERENCE_CONTACTED = 'reference_contacted',
  REFERENCE_VERIFIED = 'reference_verified',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  HOME_VISIT_SCHEDULED = 'home_visit_scheduled',
  HOME_VISIT_COMPLETED = 'home_visit_completed',
  HOME_VISIT_RESCHEDULED = 'home_visit_rescheduled',
  HOME_VISIT_CANCELLED = 'home_visit_cancelled',
  SCORE_UPDATED = 'score_updated',
  DOCUMENT_UPLOADED = 'document_uploaded',
  DECISION_MADE = 'decision_made',
  APPLICATION_APPROVED = 'application_approved',
  APPLICATION_REJECTED = 'application_rejected',
  APPLICATION_WITHDRAWN = 'application_withdrawn',
  APPLICATION_REOPENED = 'application_reopened',
  COMMUNICATION_SENT = 'communication_sent',
  COMMUNICATION_RECEIVED = 'communication_received',
  SYSTEM_AUTO_PROGRESSION = 'system_auto_progression',
  MANUAL_OVERRIDE = 'manual_override',
}

export interface TimelineEvent {
  timeline_id: string;
  application_id: string;
  event_type: TimelineEventType;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  created_by?: string;
  created_by_system?: boolean;
  created_at: string;
  updated_at: string;
  previous_stage?: string;
  new_stage?: string;
  previous_status?: string;
  new_status?: string;
}

interface ApplicationTimelineProps {
  applicationId: string;
  events: TimelineEvent[];
  loading?: boolean;
  onAddNote?: (note: string, noteType: string) => void;
}

const TimelineContainer = styled.div`
  position: relative;
  padding: 0 1rem;
`;

const TimelineLine = styled.div`
  position: absolute;
  left: 2rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
  z-index: 0;
`;

const TimelineItem = styled.div<{ isSystem?: boolean }>`
  position: relative;
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  z-index: 1;

  &:not(:last-child) {
    border-bottom: 1px solid #f3f4f6;
  }
`;

const EventIcon = styled.div<{ eventType: TimelineEventType; isSystem?: boolean }>`
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: ${props => getEventColor(props.eventType)};
  border: 3px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 2;

  ${props =>
    props.isSystem &&
    `
    background: #6b7280;
    opacity: 0.8;
  `}
`;

const EventContent = styled.div`
  flex: 1;
  padding-top: 0.25rem;
`;

const EventHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.25rem;
`;

const EventTitle = styled.h4`
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
  flex: 1;
`;

const EventTimestamp = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  flex-shrink: 0;
`;

const EventDescription = styled.p`
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  color: #4b5563;
  line-height: 1.4;
`;

const EventMetadata = styled.div`
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
`;

const MetadataItem = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #6b7280;

  &:not(:last-child) {
    margin-bottom: 0.25rem;
  }
`;

const SystemBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const AddNoteSection = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
`;

const NoteForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const NoteInput = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const NoteTypeSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const SubmitButton = styled.button`
  align-self: flex-start;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

function getEventColor(eventType: TimelineEventType): string {
  const colors: Record<TimelineEventType, string> = {
    [TimelineEventType.STAGE_CHANGE]: '#3b82f6', // Blue
    [TimelineEventType.STATUS_UPDATE]: '#8b5cf6', // Purple
    [TimelineEventType.NOTE_ADDED]: '#10b981', // Green
    [TimelineEventType.REFERENCE_CONTACTED]: '#f59e0b', // Yellow
    [TimelineEventType.REFERENCE_VERIFIED]: '#10b981', // Green
    [TimelineEventType.INTERVIEW_SCHEDULED]: '#8b5cf6', // Purple
    [TimelineEventType.INTERVIEW_COMPLETED]: '#10b981', // Green
    [TimelineEventType.HOME_VISIT_SCHEDULED]: '#f59e0b', // Orange
    [TimelineEventType.HOME_VISIT_COMPLETED]: '#10b981', // Green
    [TimelineEventType.HOME_VISIT_RESCHEDULED]: '#f59e0b', // Orange
    [TimelineEventType.HOME_VISIT_CANCELLED]: '#ef4444', // Red
    [TimelineEventType.SCORE_UPDATED]: '#8b5cf6', // Purple
    [TimelineEventType.DOCUMENT_UPLOADED]: '#06b6d4', // Cyan
    [TimelineEventType.DECISION_MADE]: '#8b5cf6', // Purple
    [TimelineEventType.APPLICATION_APPROVED]: '#10b981', // Green
    [TimelineEventType.APPLICATION_REJECTED]: '#ef4444', // Red
    [TimelineEventType.APPLICATION_WITHDRAWN]: '#6b7280', // Gray
    [TimelineEventType.APPLICATION_REOPENED]: '#3b82f6', // Blue
    [TimelineEventType.COMMUNICATION_SENT]: '#06b6d4', // Cyan
    [TimelineEventType.COMMUNICATION_RECEIVED]: '#06b6d4', // Cyan
    [TimelineEventType.SYSTEM_AUTO_PROGRESSION]: '#6b7280', // Gray
    [TimelineEventType.MANUAL_OVERRIDE]: '#f59e0b', // Orange
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

export const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({
  events,
  loading = false,
  onAddNote,
}) => {
  const [noteText, setNoteText] = React.useState('');
  const [noteType, setNoteType] = React.useState('general');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !onAddNote) {
      return;
    }

    setSubmitting(true);
    try {
      await onAddNote(noteText.trim(), noteType);
      setNoteText('');
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <TimelineContainer>
        <div>Loading timeline...</div>
      </TimelineContainer>
    );
  }

  return (
    <TimelineContainer>
      <TimelineLine />

      {events.map(event => (
        <TimelineItem key={event.timeline_id} isSystem={event.created_by_system}>
          <EventIcon eventType={event.event_type} isSystem={event.created_by_system}>
            {getEventIcon(event.event_type)}
          </EventIcon>

          <EventContent>
            <EventHeader>
              <EventTitle>{event.title}</EventTitle>
              <EventTimestamp>{formatDateTime(new Date(event.created_at))}</EventTimestamp>
            </EventHeader>

            {event.created_by_system && <SystemBadge>🤖 Automated</SystemBadge>}

            {event.description && <EventDescription>{event.description}</EventDescription>}

            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <EventMetadata>
                {Object.entries(event.metadata).map(([key, value]) => (
                  <MetadataItem key={key}>
                    <span style={{ fontWeight: 500 }}>{key}:</span>
                    <span>{String(value)}</span>
                  </MetadataItem>
                ))}
              </EventMetadata>
            )}
          </EventContent>
        </TimelineItem>
      ))}

      {onAddNote && (
        <AddNoteSection>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Add Note</h4>
          <NoteForm onSubmit={handleSubmitNote}>
            <NoteTypeSelect value={noteType} onChange={e => setNoteType(e.target.value)}>
              <option value="general">General Note</option>
              <option value="interview">Interview Note</option>
              <option value="home_visit">Home Visit Note</option>
              <option value="reference">Reference Note</option>
            </NoteTypeSelect>

            <NoteInput
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note about this application..."
              disabled={submitting}
            />

            <SubmitButton type="submit" disabled={!noteText.trim() || submitting}>
              {submitting ? 'Adding...' : 'Add Note'}
            </SubmitButton>
          </NoteForm>
        </AddNoteSection>
      )}
    </TimelineContainer>
  );
};
