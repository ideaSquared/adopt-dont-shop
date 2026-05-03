import React from 'react';
import { EventAnalytics as EventAnalyticsType } from '../../types/events';
import * as styles from './EventAnalytics.css';

interface EventAnalyticsProps {
  analytics: EventAnalyticsType | null;
  loading?: boolean;
}

const getAttendanceColor = (rate: number): string => {
  if (rate >= 80) {
    return '#10b981';
  }
  if (rate >= 60) {
    return '#f59e0b';
  }
  return '#ef4444';
};

const EventAnalytics: React.FC<EventAnalyticsProps> = ({ analytics, loading }) => {
  if (loading) {
    return (
      <div className={styles.analyticsContainer}>
        <div className={styles.loadingState}>Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={styles.analyticsContainer}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📊</div>
          <p className={styles.emptyStateText}>No analytics data available yet.</p>
          <p className={styles.emptyStateText}>
            Analytics will be available after the event is completed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.analyticsContainer}>
      <h3 className={styles.title}>Event Analytics</h3>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Registrations</div>
          <div className={styles.metricValue}>{analytics.totalRegistrations}</div>
          <div className={styles.metricSubtext}>People registered</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Actual Attendance</div>
          <div className={styles.metricValue}>{analytics.actualAttendance}</div>
          <div className={styles.metricSubtext}>People attended</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Attendance Rate</div>
          <div className={styles.metricValue}>{analytics.attendanceRate}%</div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${analytics.attendanceRate}%`,
                background: getAttendanceColor(analytics.attendanceRate),
              }}
            />
          </div>
        </div>

        {analytics.adoptionsFromEvent !== undefined && (
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Adoptions</div>
            <div className={styles.metricValue}>{analytics.adoptionsFromEvent}</div>
            <div className={styles.metricSubtext}>Successful adoptions</div>
          </div>
        )}

        {analytics.fundsRaised !== undefined && (
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Funds Raised</div>
            <div className={styles.metricValue}>£{analytics.fundsRaised.toLocaleString()}</div>
            <div className={styles.metricSubtext}>Total fundraising</div>
          </div>
        )}

        {analytics.volunteerHours !== undefined && (
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Volunteer Hours</div>
            <div className={styles.metricValue}>{analytics.volunteerHours}</div>
            <div className={styles.metricSubtext}>Hours contributed</div>
          </div>
        )}

        {analytics.feedbackScore !== undefined && (
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Feedback Score</div>
            <div className={styles.metricValue}>{analytics.feedbackScore}/5</div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${(analytics.feedbackScore / 5) * 100}%`,
                  background: '#f59e0b',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {analytics.demographics && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Demographics</h4>
          <div className={styles.demographicRow}>
            <span>New Visitors</span>
            <strong>{analytics.demographics.newVisitors}</strong>
          </div>
          <div className={styles.demographicRow}>
            <span>Returning Visitors</span>
            <strong>{analytics.demographics.returningVisitors}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventAnalytics;
