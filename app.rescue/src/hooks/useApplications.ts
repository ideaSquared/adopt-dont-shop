import { useState, useEffect, useCallback } from 'react';
import { RescueApplicationService } from '../services/applicationService';
import type {
  ApplicationListItem,
  ApplicationFilter,
  ApplicationSort,
  ApplicationStats,
  ReferenceCheck,
  HomeVisit,
  ApplicationTimeline,
} from '../types/applications';
import type { StageAction } from '../types/applicationStages';

export const useApplications = () => {
  const [applicationService] = useState(() => new RescueApplicationService());
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApplicationFilter>({});
  const [sort, setSort] = useState<ApplicationSort>({ field: 'submittedAt', direction: 'desc' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await applicationService.getApplications(
        filter,
        sort,
        pagination.page,
        pagination.limit
      );

      setApplications(result.applications);
      setPagination(prev => ({
        ...prev,
        total: result.total,
        totalPages: result.totalPages,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [applicationService, filter, sort, pagination.page, pagination.limit]);

  const updateApplicationStatus = useCallback(
    async (id: string, status: string, notes?: string) => {
      try {
        setLoading(true);
        await applicationService.updateApplicationStatus(id, status, notes);
        await fetchApplications(); // Refresh the list
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update application status');
      } finally {
        setLoading(false);
      }
    },
    [applicationService, fetchApplications]
  );

  const updateFilter = useCallback((newFilter: ApplicationFilter) => {
    setFilter(newFilter);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  }, []);

  const updateSort = useCallback((newSort: ApplicationSort) => {
    setSort(newSort);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when sorting
  }, []);

  const changePage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const changePageSize = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  // Fetch applications when dependencies change
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    loading,
    error,
    filter,
    sort,
    pagination,
    updateFilter,
    updateSort,
    changePage,
    changePageSize,
    updateApplicationStatus,
    refetch: fetchApplications,
  };
};

export const useApplicationDetails = (applicationId: string | null) => {
  const [applicationService] = useState(() => new RescueApplicationService());
  const [application, setApplication] = useState<any>(null);
  const [references, setReferences] = useState<ReferenceCheck[]>([]);
  const [homeVisits, setHomeVisits] = useState<HomeVisit[]>([]);
  const [timeline, setTimeline] = useState<ApplicationTimeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplicationDetails = useCallback(async () => {
    if (!applicationId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [appData, referencesData, visitsData, timelineData] = await Promise.all([
        applicationService.getApplicationById(applicationId),
        applicationService.getReferenceChecks(applicationId),
        applicationService.getHomeVisits(applicationId),
        applicationService.getApplicationTimeline(applicationId),
      ]);

      setApplication(appData);
      setReferences(referencesData);
      setHomeVisits(visitsData);
      setTimeline(timelineData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch application details');
    } finally {
      setLoading(false);
    }
  }, [applicationService, applicationId]);

  const updateReferenceCheck = useCallback(
    async (referenceId: string, status: string, notes?: string) => {
      if (!applicationId) {
        return;
      }

      try {
        await applicationService.updateReferenceCheck(applicationId, referenceId, status, notes);
        await fetchApplicationDetails(); // Refresh data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update reference check');
      }
    },
    [applicationService, applicationId, fetchApplicationDetails]
  );

  const scheduleHomeVisit = useCallback(
    async (visitData: {
      scheduledDate: string;
      scheduledTime: string;
      assignedStaff: string;
      notes?: string;
    }) => {
      if (!applicationId) {
        return;
      }

      try {
        await applicationService.scheduleHomeVisit(applicationId, visitData);
        await fetchApplicationDetails(); // Refresh data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to schedule home visit');
      }
    },
    [applicationService, applicationId, fetchApplicationDetails]
  );

  const updateHomeVisit = useCallback(
    async (visitId: string, updateData: Partial<HomeVisit>) => {
      if (!applicationId) {
        return;
      }

      try {
        await applicationService.updateHomeVisit(applicationId, visitId, updateData);
        await fetchApplicationDetails(); // Refresh data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update home visit');
      }
    },
    [applicationService, applicationId, fetchApplicationDetails]
  );

  const addTimelineEvent = useCallback(
    async (event: string, description: string, data?: Record<string, any>) => {
      if (!applicationId) {
        return;
      }

      try {
        await applicationService.addTimelineEvent(applicationId, event, description, data);
        await fetchApplicationDetails(); // Refresh data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add timeline event');
      }
    },
    [applicationService, applicationId, fetchApplicationDetails]
  );

  const transitionStage = useCallback(
    async (action: StageAction, notes?: string) => {
      if (!applicationId) {
        return;
      }

      try {
        await applicationService.transitionStage(applicationId, action.type, notes);
        await fetchApplicationDetails(); // Refresh data
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to transition application stage');
        throw err; // Re-throw to allow the modal to handle the error
      }
    },
    [applicationService, applicationId, fetchApplicationDetails]
  );

  useEffect(() => {
    fetchApplicationDetails();
  }, [fetchApplicationDetails]);

  return {
    application,
    references,
    homeVisits,
    timeline,
    loading,
    error,
    updateReferenceCheck,
    scheduleHomeVisit,
    updateHomeVisit,
    addTimelineEvent,
    transitionStage,
    refetch: fetchApplicationDetails,
  };
};

export const useApplicationStats = () => {
  const [applicationService] = useState(() => new RescueApplicationService());
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const statsData = await applicationService.getApplicationStats();
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch application stats');
    } finally {
      setLoading(false);
    }
  }, [applicationService]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
};
