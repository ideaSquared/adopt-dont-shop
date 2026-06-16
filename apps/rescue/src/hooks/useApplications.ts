import { useState, useEffect, useCallback } from 'react';
import { useRealtimeAnalytics } from '@adopt-dont-shop/lib.analytics';
import { RescueApplicationService } from '../services/applicationService';
import type {
  ApplicationListItem,
  ApplicationFilter,
  ApplicationSort,
  ReferenceCheck,
  HomeVisit,
  ApplicationTimeline,
} from '../types/applications';
import type { ApplicationStage, StageAction } from '../types/applicationStages';

/**
 * Application detail payload tolerated by useApplicationDetails / the
 * ApplicationReview consumer. Field set is the union of what the backend
 * returns and what the review modal renders — both are loose because the
 * backend response shape is still evolving.
 */
type ApplicationDetail = {
  id: string;
  status: string;
  petId?: string;
  petName?: string;
  applicantName?: string;
  userName?: string;
  submittedDaysAgo?: number;
  submittedAt?: string;
  stage?: ApplicationStage;
  data?: Record<string, unknown>;
} & Record<string, unknown>;

// Module-level singleton so every call to useApplications/useApplicationDetails/etc.
// shares one instance and avoids re-creating the service on every render.
const applicationServiceInstance = new RescueApplicationService();

export const useApplications = () => {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApplicationFilter>({});
  const [sort, setSort] = useState<ApplicationSort>({ field: 'submittedAt', direction: 'desc' });
  // Pagination control state (triggers refetch when changed)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  // Pagination metadata (set from response — must NOT be in fetchApplications deps)
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchApplications = useCallback(
    async (cancelled?: { value: boolean }) => {
      try {
        setLoading(true);
        setError(null);

        const result = await applicationServiceInstance.getApplications(filter, sort, page, limit);

        if (cancelled?.value) return;
        setApplications(result.applications);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (err) {
        if (cancelled?.value) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch applications');
      } finally {
        if (!cancelled?.value) setLoading(false);
      }
    },
    [filter, sort, page, limit]
  );

  const updateApplicationStatus = useCallback(
    async (id: string, status: string, notes?: string) => {
      try {
        setLoading(true);
        await applicationServiceInstance.updateApplicationStatus(id, status, notes);
        await fetchApplications();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update application status');
      } finally {
        setLoading(false);
      }
    },
    [fetchApplications]
  );

  const updateFilter = useCallback((newFilter: ApplicationFilter) => {
    setFilter(newFilter);
    setPage(1); // Reset to first page when filtering
  }, []);

  const updateSort = useCallback((newSort: ApplicationSort) => {
    setSort(newSort);
    setPage(1); // Reset to first page when sorting
  }, []);

  const changePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const changePageSize = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  // Fetch applications when dependencies change
  useEffect(() => {
    const cancelled = { value: false };
    fetchApplications(cancelled);
    return () => {
      cancelled.value = true;
    };
  }, [fetchApplications]);

  // ADS C4-6: live-update the application list when the backend emits a
  // new submission or status change for this rescue. Both events trigger
  // the same plain refetch — no optimistic patching — so the list stays
  // consistent with the server.
  // Wrap in a no-arg callback so the payload type from useRealtimeAnalytics
  // doesn't leak into fetchApplications' optional cancelled parameter.
  useRealtimeAnalytics(
    'application_created',
    useCallback(() => {
      fetchApplications();
    }, [fetchApplications])
  );
  useRealtimeAnalytics(
    'application_updated',
    useCallback(() => {
      fetchApplications();
    }, [fetchApplications])
  );

  return {
    applications,
    loading,
    error,
    filter,
    sort,
    pagination: { page, limit, total, totalPages },
    updateFilter,
    updateSort,
    changePage,
    changePageSize,
    updateApplicationStatus,
    refetch: fetchApplications,
  };
};

export const useApplicationDetails = (applicationId: string | null) => {
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [references, setReferences] = useState<ReferenceCheck[]>([]);
  const [homeVisits, setHomeVisits] = useState<HomeVisit[]>([]);
  const [timeline, setTimeline] = useState<ApplicationTimeline[]>([]);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  // UX P2 G: surface per-section failures independently so a single broken
  // sub-resource doesn't blow away the rest of the modal.
  const [referencesError, setReferencesError] = useState<string | null>(null);
  const [homeVisitsError, setHomeVisitsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplicationDetails = useCallback(
    async (cancelled?: { value: boolean }) => {
      if (!applicationId) {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setTimelineError(null);
        setReferencesError(null);
        setHomeVisitsError(null);

        // UX P0/P1 #6 + P2 G: sub-resource failures (timeline, references,
        // home visits) used to either swallow to `[]` or take down the whole
        // modal via Promise.all rejection. They now surface per-section so
        // the rest of the applicant data remains visible.
        const [appData, referencesResult, visitsResult, timelineResult] = await Promise.all([
          applicationServiceInstance.getApplicationById(applicationId),
          applicationServiceInstance.getReferenceChecks(applicationId).catch((err: unknown) => {
            const message = err instanceof Error ? err.message : 'Failed to load reference checks';
            if (!cancelled?.value) setReferencesError(message);
            return [] as ReferenceCheck[];
          }),
          applicationServiceInstance.getHomeVisits(applicationId).catch((err: unknown) => {
            const message = err instanceof Error ? err.message : 'Failed to load home visits';
            if (!cancelled?.value) setHomeVisitsError(message);
            return [] as HomeVisit[];
          }),
          applicationServiceInstance.getApplicationTimeline(applicationId).catch((err: unknown) => {
            const message = err instanceof Error ? err.message : 'Failed to load timeline';
            if (!cancelled?.value) setTimelineError(message);
            return [] as ApplicationTimeline[];
          }),
        ]);

        if (cancelled?.value) return;
        setApplication(appData as ApplicationDetail);
        setReferences(referencesResult);
        setHomeVisits(visitsResult);
        setTimeline(timelineResult);
      } catch (err) {
        if (cancelled?.value) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch application details');
      } finally {
        if (!cancelled?.value) setLoading(false);
      }
    },
    [applicationId]
  );

  const updateReferenceCheck = useCallback(
    async (referenceId: string, status: string, notes?: string) => {
      if (!applicationId) {
        return;
      }

      try {
        await applicationServiceInstance.updateReferenceCheck(
          applicationId,
          referenceId,
          status,
          notes
        );
        await fetchApplicationDetails();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update reference check');
      }
    },
    [applicationId, fetchApplicationDetails]
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
        await applicationServiceInstance.scheduleHomeVisit(applicationId, visitData);
        await fetchApplicationDetails();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to schedule home visit');
      }
    },
    [applicationId, fetchApplicationDetails]
  );

  const updateHomeVisit = useCallback(
    async (visitId: string, updateData: Partial<HomeVisit>) => {
      if (!applicationId) {
        return;
      }

      try {
        await applicationServiceInstance.updateHomeVisit(applicationId, visitId, updateData);
        await fetchApplicationDetails();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update home visit');
      }
    },
    [applicationId, fetchApplicationDetails]
  );

  const addTimelineEvent = useCallback(
    async (event: string, description: string, data?: Record<string, unknown>) => {
      if (!applicationId) {
        return;
      }

      try {
        await applicationServiceInstance.addTimelineEvent(applicationId, event, description, data);
        await fetchApplicationDetails();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add timeline event');
      }
    },
    [applicationId, fetchApplicationDetails]
  );

  const transitionStage = useCallback(
    async (action: StageAction, notes?: string) => {
      if (!applicationId) {
        return;
      }

      try {
        await applicationServiceInstance.transitionStage(
          applicationId,
          action.type,
          action.nextStage,
          notes
        );
        await fetchApplicationDetails();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to transition application stage');
        throw err; // Re-throw to allow the modal to handle the error
      }
    },
    [applicationId, fetchApplicationDetails]
  );

  useEffect(() => {
    const cancelled = { value: false };
    fetchApplicationDetails(cancelled);
    return () => {
      cancelled.value = true;
    };
  }, [fetchApplicationDetails]);

  return {
    application,
    references,
    homeVisits,
    timeline,
    timelineError,
    referencesError,
    homeVisitsError,
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
