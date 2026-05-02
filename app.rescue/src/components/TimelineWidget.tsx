import React from 'react';
import { TimelineEvent, TimelineEventType } from './ApplicationTimeline';
import { formatDateTime } from '@adopt-dont-shop/lib.utils';
import * as styles from './TimelineWidget.css';

interface TimelineWidgetProps {
  events: TimelineEvent[];
  maxEvents?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
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
      <div className={styles.widgetContainer}>
        <div className={styles.widgetHeader}>
          <h4 className={styles.widgetTitle}>Recent Activity</h4>
        </div>
        <div className={styles.emptyState}>No activity yet</div>
      </div>
    );
  }

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.widgetHeader}>
        <h4 className={styles.widgetTitle}>Recent Activity</h4>
        {showViewAll && onViewAll && (hasMoreEvents || events.length > 0) && (
          <button className={styles.viewAllButton} onClick={onViewAll}>
            View All ({events.length})
          </button>
        )}
      </div>

      <div className={styles.compactEventList}>
        {displayEvents.map(event => (
          <div key={event.timeline_id} className={styles.compactEvent}>
            <div
              className={styles.eventIcon}
              style={{ background: getEventColor(event.event_type) }}
            >
              {getEventIcon(event.event_type)}
            </div>

            <div className={styles.eventInfo}>
              <div className={styles.eventTitle}>{event.title}</div>
              <div className={styles.eventTime}>{formatDateTime(new Date(event.created_at))}</div>
            </div>

            {event.created_by_system && (
              <span className={styles.systemIndicator} title="Automated event">
                🤖
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
