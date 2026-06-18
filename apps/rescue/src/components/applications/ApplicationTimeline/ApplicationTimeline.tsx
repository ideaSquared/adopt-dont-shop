import React from 'react';
import type { ApplicationTimeline as ApplicationTimelineType } from '../../../types/applications';
import { TimelineEventType } from '../../../types/applications';
import { formatStatusName } from '../../../utils/statusUtils';
import * as styles from '../ApplicationReview.css';

const formatTimelineTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const getTimelineIcon = (eventType: string): string => {
  switch (eventType) {
    case 'status_change':
      return '📋';
    case 'reference_check':
      return '📞';
    case 'home_visit':
      return '🏠';
    case 'note':
      return '📝';
    case 'system':
      return '⚙️';
    default:
      return '•';
  }
};

const getEventTitle = (event: string): string => {
  switch (event) {
    case 'status_change':
      return 'Status Updated';
    case 'reference_check':
      return 'Reference Check';
    case 'home_visit':
      return 'Home Visit';
    case 'note':
      return 'Note Added';
    case 'system':
      return 'System Event';
    default:
      return event
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
};

type ApplicationTimelineProps = {
  timeline: ApplicationTimelineType[];
  timelineError?: string | null;
  showAddEvent: boolean;
  setShowAddEvent: (show: boolean) => void;
  newEventType: TimelineEventType;
  setNewEventType: (type: TimelineEventType) => void;
  newEventDescription: string;
  setNewEventDescription: (desc: string) => void;
  isAddingEvent: boolean;
  onAddEvent: () => void;
};

export const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({
  timeline,
  timelineError,
  showAddEvent,
  setShowAddEvent,
  newEventType,
  setNewEventType,
  newEventDescription,
  setNewEventDescription,
  isAddingEvent,
  onAddEvent,
}) => (
  <div className={styles.section}>
    <div className={styles.sectionHeader}>
      <h3 className={styles.sectionTitle}>Application Timeline</h3>
      <button
        type="button"
        className={styles.button({ variant: 'primary' })}
        onClick={() => setShowAddEvent(!showAddEvent)}
      >
        {showAddEvent ? 'Cancel' : 'Add Event'}
      </button>
    </div>

    {showAddEvent && (
      <div className={styles.addEventForm}>
        <h4 className={styles.addEventTitle}>Add Timeline Event</h4>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="timeline-event-type">
              Event Type
            </label>
            <select
              id="timeline-event-type"
              className={styles.formSelect}
              value={newEventType}
              onChange={e => setNewEventType(e.target.value as TimelineEventType)}
            >
              <option value={TimelineEventType.NOTE_ADDED}>Note</option>
              <option value={TimelineEventType.REFERENCE_CONTACTED}>Reference Check</option>
              <option value={TimelineEventType.HOME_VISIT_SCHEDULED}>Home Visit</option>
              <option value={TimelineEventType.MANUAL_OVERRIDE}>Manual Override</option>
            </select>
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="timeline-event-desc">
              Description
            </label>
            <textarea
              id="timeline-event-desc"
              className={styles.formTextarea}
              value={newEventDescription}
              onChange={e => setNewEventDescription(e.target.value)}
              placeholder="Enter event description..."
              rows={3}
            />
          </div>
        </div>
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.button({ variant: 'secondary' })}
            onClick={() => {
              setShowAddEvent(false);
              setNewEventDescription('');
              setNewEventType(TimelineEventType.NOTE_ADDED);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.button({ variant: 'primary' })}
            onClick={onAddEvent}
            disabled={!newEventDescription.trim() || isAddingEvent}
          >
            {isAddingEvent ? 'Adding...' : 'Add Event'}
          </button>
        </div>
      </div>
    )}

    <div className={styles.timelineContainer}>
      {timelineError ? (
        <div className={styles.emptyTimeline} role="alert">
          <p>Failed to load timeline events.</p>
          <p>{timelineError}</p>
        </div>
      ) : timeline.length === 0 ? (
        <div className={styles.emptyTimeline}>
          <p>No timeline events yet.</p>
          <p>Timeline events will appear here as actions are taken on this application.</p>
        </div>
      ) : (
        timeline
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .map(event => {
            const iconType = (
              ['status_change', 'reference_check', 'home_visit', 'note', 'system'] as const
            ).includes(
              event.event as 'status_change' | 'reference_check' | 'home_visit' | 'note' | 'system'
            )
              ? (event.event as
                  | 'status_change'
                  | 'reference_check'
                  | 'home_visit'
                  | 'note'
                  | 'system')
              : 'default';

            return (
              <div key={event.id} className={styles.timelineItem}>
                <div className={styles.timelineIcon({ type: iconType })}>
                  {getTimelineIcon(event.event)}
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <h4 className={styles.timelineTitle}>{getEventTitle(event.event)}</h4>
                    <span className={styles.timelineTimestamp}>
                      {formatTimelineTimestamp(event.timestamp)}
                    </span>
                  </div>
                  <p className={styles.timelineDescription}>
                    {event.event === 'status_change' &&
                    typeof event.data?.newStatus === 'string'
                      ? `Status changed to: ${formatStatusName(event.data.newStatus)}`
                      : event.description}
                  </p>
                  {event.data && Object.keys(event.data).length > 0 && (
                    <div className={styles.timelineData}>
                      <strong>Additional Details:</strong>
                      {typeof event.data.oldStatus === 'string' &&
                      typeof event.data.newStatus === 'string' ? (
                        <div className={styles.statusChangeBlock}>
                          <span className={styles.oldStatusText}>
                            From: {formatStatusName(event.data.oldStatus)}
                          </span>
                          <br />
                          <span className={styles.newStatusText}>
                            To: {formatStatusName(event.data.newStatus)}
                          </span>
                          {typeof event.data.notes === 'string' && (
                            <>
                              <br />
                              <span className={styles.notesText}>Notes: {event.data.notes}</span>
                            </>
                          )}
                        </div>
                      ) : (
                        <pre>{JSON.stringify(event.data, null, 2)}</pre>
                      )}
                    </div>
                  )}
                  <span className={styles.timelineUser}>by {event.userName}</span>
                </div>
              </div>
            );
          })
      )}
    </div>
  </div>
);
