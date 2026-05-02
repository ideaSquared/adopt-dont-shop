import React from 'react';
import { formatDateTime } from '@adopt-dont-shop/lib.utils';
import * as styles from './ApplicationTimeline.css';

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
  metadata?: Record<string, unknown>;
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
      <div className={styles.timelineContainer}>
        <div>Loading timeline...</div>
      </div>
    );
  }

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timelineLine} />

      {events.map(event => (
        <div key={event.timeline_id} className={styles.timelineItem}>
          <div
            className={styles.eventIcon}
            style={{
              background: event.created_by_system ? '#6b7280' : getEventColor(event.event_type),
              opacity: event.created_by_system ? 0.8 : 1,
            }}
          >
            {getEventIcon(event.event_type)}
          </div>

          <div className={styles.eventContent}>
            <div className={styles.eventHeader}>
              <h4 className={styles.eventTitle}>{event.title}</h4>
              <span className={styles.eventTimestamp}>{formatDateTime(new Date(event.created_at))}</span>
            </div>

            {event.created_by_system && <span className={styles.systemBadge}>🤖 Automated</span>}

            {event.description && <p className={styles.eventDescription}>{event.description}</p>}

            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div className={styles.eventMetadata}>
                {Object.entries(event.metadata).map(([key, value]) => (
                  <div key={key} className={styles.metadataItem}>
                    <span style={{ fontWeight: 500 }}>{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {onAddNote && (
        <div className={styles.addNoteSection}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Add Note</h4>
          <form className={styles.noteForm} onSubmit={handleSubmitNote}>
            <select
              className={styles.noteTypeSelect}
              value={noteType}
              onChange={e => setNoteType(e.target.value)}
            >
              <option value="general">General Note</option>
              <option value="interview">Interview Note</option>
              <option value="home_visit">Home Visit Note</option>
              <option value="reference">Reference Note</option>
            </select>

            <textarea
              className={styles.noteInput}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note about this application..."
              disabled={submitting}
            />

            <button
              className={styles.submitButton}
              type="submit"
              disabled={!noteText.trim() || submitting}
            >
              {submitting ? 'Adding...' : 'Add Note'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
