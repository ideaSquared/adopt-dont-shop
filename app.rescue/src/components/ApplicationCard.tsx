import React from 'react';
import { TimelineWidget } from './TimelineWidget';
import { useTimelineWidget, useTimelineSummary } from '../hooks/useTimelineWidget';
import { formatDate, formatDateTime } from '@adopt-dont-shop/lib.utils';
import * as styles from './ApplicationCard.css';

interface ApplicationCardProps {
  application: {
    application_id: string;
    applicant_name: string;
    pet_name: string;
    stage: string;
    status: string;
    submitted_date: string;
    priority: 'high' | 'medium' | 'low';
  };
  onViewDetails: (applicationId: string) => void;
  onViewTimeline: (applicationId: string) => void;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onViewDetails,
  onViewTimeline,
}) => {
  const {
    events,
    loading: timelineLoading,
    hasEvents,
    recentEventCount,
  } = useTimelineWidget({
    applicationId: application.application_id,
    maxEvents: 3,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
  });

  const { summary, loading: summaryLoading } = useTimelineSummary({
    applicationId: application.application_id,
    recentThresholdHours: 24,
  });

  const handleViewDetails = () => {
    onViewDetails(application.application_id);
  };

  const handleViewTimeline = () => {
    onViewTimeline(application.application_id);
  };

  const getActivitySummaryText = () => {
    if (summaryLoading) {
      return 'Loading activity...';
    }
    if (!summary) {
      return 'No activity data';
    }

    const { totalEvents, lastActivity, hasRecentActivity } = summary;

    if (totalEvents === 0) {
      return 'No activity yet';
    }

    const lastActivityText = lastActivity ? formatDateTime(lastActivity) : 'Unknown';

    return hasRecentActivity
      ? `${totalEvents} events • Last: ${lastActivityText} • Recent activity`
      : `${totalEvents} events • Last: ${lastActivityText}`;
  };

  const statusKey = application.status.toLowerCase() as
    | 'pending'
    | 'reviewing'
    | 'visiting'
    | 'deciding'
    | 'approved'
    | 'rejected'
    | 'default';
  const validStatuses = ['pending', 'reviewing', 'visiting', 'deciding', 'approved', 'rejected'];
  const statusVariant = validStatuses.includes(statusKey) ? statusKey : 'default';

  const priorityKey = application.priority as 'high' | 'medium' | 'low';

  return (
    <div className={styles.cardContainer}>
      <div className={styles.cardHeader}>
        <div className={styles.basicInfo}>
          <h3 className={styles.applicantName}>{application.applicant_name}</h3>
          <div className={styles.petName}>Applying for: {application.pet_name}</div>
          <span
            className={styles.statusBadge({
              status: statusVariant,
              highPriority: application.priority === 'high',
            })}
          >
            <div className={styles.priorityIndicator({ priority: priorityKey })} />
            {application.status}
          </span>
        </div>
      </div>

      <div className={styles.metaInfo}>
        <div>Submitted: {formatDate(new Date(application.submitted_date))}</div>
        <div>•</div>
        <div>Stage: {application.stage}</div>
      </div>

      <div className={styles.activitySummary}>
        <div className={styles.activityIcon({ hasRecent: summary?.hasRecentActivity || false })} />
        <div className={styles.activityText}>{getActivitySummaryText()}</div>
      </div>

      {timelineLoading ? (
        <div className={styles.skeletonBox} style={{ height: '120px', marginBottom: '1rem' }} />
      ) : hasEvents ? (
        <TimelineWidget
          events={events}
          maxEvents={3}
          showViewAll={true}
          onViewAll={handleViewTimeline}
        />
      ) : (
        <div
          style={{
            padding: '1rem',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '0.875rem',
            border: '1px dashed #d1d5db',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
          }}
        >
          No recent activity
        </div>
      )}

      <div className={styles.cardActions}>
        <button className={styles.actionButton({ variant: 'primary' })} onClick={handleViewDetails}>
          View Details
        </button>
        <button
          className={styles.actionButton({ variant: 'secondary' })}
          onClick={handleViewTimeline}
        >
          Timeline ({recentEventCount})
        </button>
      </div>
    </div>
  );
};
