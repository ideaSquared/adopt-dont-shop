import React from 'react';
import {
  Circle,
  ClipboardList,
  FileText,
  House,
  Phone,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import {
  Alert,
  Button,
  EmptyState,
  FormField,
  SelectInput,
  TextArea,
} from '@adopt-dont-shop/lib.components';
import { getStatusDisplay } from '@adopt-dont-shop/lib.types';
import { formatCustomDate, formatTime } from '@adopt-dont-shop/lib.utils';
import {
  TimelineEventType,
  type ApplicationTimeline as ApplicationTimelineType,
} from '../../../types/applications';
import * as styles from '../ApplicationReview.css';

const formatStatusName = (status: string): string => getStatusDisplay('application', status).label;

const EVENT_TYPE_OPTIONS: { value: TimelineEventType; label: string }[] = [
  { value: TimelineEventType.NOTE_ADDED, label: 'Note' },
  { value: TimelineEventType.REFERENCE_CONTACTED, label: 'Reference Check' },
  { value: TimelineEventType.HOME_VISIT_SCHEDULED, label: 'Home Visit' },
  { value: TimelineEventType.MANUAL_OVERRIDE, label: 'Manual Override' },
];

const toEventType = (value: string | string[]): TimelineEventType =>
  EVENT_TYPE_OPTIONS.find(option => option.value === value)?.value ?? TimelineEventType.NOTE_ADDED;

// Compact relative stamp ("Today at 14:30", "3 days ago", "1 Jun"). The shared
// formatRelativeDate always reads "x days ago", so it is not equivalent here.
const formatTimelineTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today at ${formatTime(date)}`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${formatTime(date)}`;
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return formatCustomDate(date, date.getFullYear() !== now.getFullYear() ? 'd MMM yyyy' : 'd MMM');
};

const TIMELINE_ICONS: Record<string, LucideIcon> = {
  status_change: ClipboardList,
  reference_check: Phone,
  home_visit: House,
  note: FileText,
  system: Settings,
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
      <Button onClick={() => setShowAddEvent(!showAddEvent)}>
        {showAddEvent ? 'Cancel' : 'Add Event'}
      </Button>
    </div>

    {showAddEvent && (
      <div className={styles.addEventForm}>
        <h4 className={styles.addEventTitle}>Add Timeline Event</h4>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <SelectInput
              label="Event Type"
              value={newEventType}
              onChange={value => setNewEventType(toEventType(value))}
              options={EVENT_TYPE_OPTIONS}
              fullWidth
            />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <FormField label="Description" htmlFor="timeline-event-desc">
              <TextArea
                id="timeline-event-desc"
                value={newEventDescription}
                onChange={e => setNewEventDescription(e.target.value)}
                placeholder="Enter event description..."
                rows={3}
              />
            </FormField>
          </div>
        </div>
        <div className={styles.formActions}>
          <Button
            variant="secondary"
            onClick={() => {
              setShowAddEvent(false);
              setNewEventDescription('');
              setNewEventType(TimelineEventType.NOTE_ADDED);
            }}
          >
            Cancel
          </Button>
          <Button onClick={onAddEvent} disabled={!newEventDescription.trim() || isAddingEvent}>
            {isAddingEvent ? 'Adding...' : 'Add Event'}
          </Button>
        </div>
      </div>
    )}

    <div className={styles.timelineContainer}>
      {timelineError ? (
        <Alert variant="error">
          <p>Failed to load timeline events.</p>
          <p>{timelineError}</p>
        </Alert>
      ) : timeline.length === 0 ? (
        <EmptyState
          title="No timeline events yet."
          description="Timeline events will appear here as actions are taken on this application."
          size="sm"
        />
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

            const EventIcon = TIMELINE_ICONS[event.event] ?? Circle;

            return (
              <div key={event.id} className={styles.timelineItem}>
                <div className={styles.timelineIcon({ type: iconType })}>
                  <EventIcon size="1em" aria-hidden="true" />
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <h4 className={styles.timelineTitle}>{getEventTitle(event.event)}</h4>
                    <span className={styles.timelineTimestamp}>
                      {formatTimelineTimestamp(event.timestamp)}
                    </span>
                  </div>
                  <p className={styles.timelineDescription}>
                    {event.event === 'status_change' && typeof event.data?.newStatus === 'string'
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
