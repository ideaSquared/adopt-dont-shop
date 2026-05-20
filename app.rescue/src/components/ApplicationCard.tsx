import React from 'react';
import clsx from 'clsx';
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
        <div className={clsx(styles.skeletonBox, styles.timelineSkeleton)} />
      ) : hasEvents ? (
        <TimelineWidget
          events={events}
          maxEvents={3}
          showViewAll={true}
          onViewAll={handleViewTimeline}
        />
      ) : (
        <div className={styles.noActivityPlaceholder}>No recent activity</div>
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
