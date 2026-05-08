import React, { useState, useEffect, useCallback } from 'react';
import { RescueApplicationService } from '../../services/applicationService';
import type { ApplicationListItem } from '../../types/applications';
import * as styles from './ApplicationStats.css';

// Calculate statistics from application data
const calculateApplicationStats = (applications: ApplicationListItem[]) => {
  const total = applications.length;
  const byStatus = applications.reduce(
    (acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate average processing time for completed applications
  const completedApps = applications.filter(
    app => app.status === 'approved' || app.status === 'rejected'
  );
  const avgProcessingTime =
    completedApps.length > 0
      ? Math.round(
          completedApps.reduce((sum, app) => sum + app.submittedDaysAgo, 0) / completedApps.length
        )
      : 0;

  return {
    total,
    byStatus,
    avgProcessingTime,
    recentSubmissions: applications.filter(app => app.submittedDaysAgo <= 7).length,
    pendingReferences: applications.filter(app => app.referencesStatus !== 'completed').length,
    scheduledVisits: applications.filter(app => app.homeVisitStatus === 'scheduled').length,
  };
};

interface ApplicationStatsProps {
  // No props needed - component handles its own data fetching
}

const ApplicationStatsCards: React.FC<ApplicationStatsProps> = () => {
  const [applicationService] = useState(() => new RescueApplicationService());
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all applications without any filters for statistics
      const result = await applicationService.getApplications(
        {}, // No filters
        { field: 'submittedAt', direction: 'desc' },
        1,
        1000 // Large limit to get all applications
      );

      setApplications(result.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch application statistics');
    } finally {
      setLoading(false);
    }
  }, [applicationService]);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllApplications();
  }, [fetchAllApplications]);

  if (loading) {
    return (
      <div className={styles.statsContainer}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={styles.loadingCard}>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.iconContainer}>
                  <div className={styles.loadingIconPlaceholder} />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.loadingTextPlaceholder} />
                  <div className={styles.loadingValuePlaceholder} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <div className={styles.errorText}>
            <h3 className={styles.errorTitle}>Error loading stats</h3>
            <p className={styles.errorMessage}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return null;
  }

  const stats = calculateApplicationStats(applications);

  const statCards = [
    {
      name: 'Total Applications',
      value: stats.total,
      change: 0, // Change tracking not implemented yet
      trend: 'neutral' as const,
      icon: '📄',
      color: 'blue' as const,
    },
    {
      name: 'Submitted',
      value: stats.byStatus.submitted || 0,
      change: 0,
      trend: 'neutral' as const,
      icon: '⏳',
      color: 'yellow' as const,
    },
    {
      name: 'Approved',
      value: stats.byStatus.approved || 0,
      change: 0,
      trend: 'neutral' as const,
      icon: '✅',
      color: 'green' as const,
    },
    {
      name: 'Avg. Processing Time',
      value: `${stats.avgProcessingTime}d`,
      change: 0,
      trend: 'neutral' as const,
      icon: '⏱️',
      color: 'red' as const,
    },
  ];

  return (
    <div className={styles.statsContainer}>
      {statCards.map(stat => (
        <div key={stat.name} className={styles.statCard}>
          <div className={styles.cardContent}>
            <div className={styles.cardHeader}>
              <div className={styles.iconContainer}>
                <div className={styles.icon({ color: stat.color })}>{stat.icon}</div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.statLabel}>{stat.name}</div>
                <div className={styles.statValue}>{stat.value}</div>
                {stat.change !== 0 && (
                  <div className={styles.statChange({ trend: stat.trend })}>
                    → No change from last month
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ApplicationStatsCards;
