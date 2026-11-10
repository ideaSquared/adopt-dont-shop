import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, Clock, FileText, Timer } from 'lucide-react';
import { ErrorState, MetricCard } from '@adopt-dont-shop/lib.components';
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

const applicationService = new RescueApplicationService();

// Fetch all applications without any filters for statistics.
const useApplicationStatsData = () =>
  useQuery({
    queryKey: ['applications', 'stats'],
    queryFn: () =>
      applicationService.getApplications(
        {}, // No filters
        { field: 'submittedAt', direction: 'desc' },
        1,
        1000 // Large limit to get all applications
      ),
    select: result => result.applications,
  });

const ApplicationStatsCards: React.FC = () => {
  const { data: applications, isPending, error } = useApplicationStatsData();

  if (isPending) {
    return (
      <div className={styles.statsContainer}>
        {['total', 'submitted', 'approved', 'processing'].map(key => (
          <MetricCard key={key} label="" value="" loading />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Error loading stats"
        message={error.message || 'Failed to fetch application statistics'}
        size="sm"
      />
    );
  }

  // UX P0/P1 #6: previously this returned `null` whenever there were no
  // applications, which left the page header bare and made it look like
  // the stats had errored. Compute zero-valued stats so the cards render
  // with explicit "0"s.
  const stats = calculateApplicationStats(applications ?? []);

  return (
    <div className={styles.statsContainer}>
      <MetricCard
        label="Total Applications"
        value={stats.total}
        icon={<FileText size="1em" aria-hidden="true" />}
      />
      <MetricCard
        label="Submitted"
        value={stats.byStatus.submitted || 0}
        icon={<Clock size="1em" aria-hidden="true" />}
      />
      <MetricCard
        label="Approved"
        value={stats.byStatus.approved || 0}
        icon={<CircleCheck size="1em" aria-hidden="true" />}
      />
      <MetricCard
        label="Avg. Processing Time"
        value={`${stats.avgProcessingTime}d`}
        icon={<Timer size="1em" aria-hidden="true" />}
      />
    </div>
  );
};

export default ApplicationStatsCards;
