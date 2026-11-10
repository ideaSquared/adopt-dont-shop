import { useState, useCallback } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const NO_APPLICATIONS: ApplicationListItem[] = [];
const NO_REFERENCES: ReferenceCheck[] = [];
const NO_HOME_VISITS: HomeVisit[] = [];
const NO_TIMELINE: ApplicationTimeline[] = [];

const toErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

const errorOrNull = (err: unknown, fallback: string): string | null =>
  err ? toErrorMessage(err, fallback) : null;

export const useApplications = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ApplicationFilter>({});
  const [sort, setSort] = useState<ApplicationSort>({ field: 'submittedAt', direction: 'desc' });
  // Pagination control state (changing it changes the query key, which refetches)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const query = useQuery({
    queryKey: ['applications', 'rescue-list', { filter, sort, page, limit }],
    queryFn: () => applicationServiceInstance.getApplications(filter, sort, page, limit),
    // keep the previous page visible (and its totals) while the next one loads
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      applicationServiceInstance.updateApplicationStatus(id, status, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
    // The failure is shown by the page's own error banner (via `error`), so
    // opt out of the app-wide generic mutation-failure toast.
    onError: () => undefined,
  });

  const updateApplicationStatus = useCallback(
    async (id: string, status: string, notes?: string) => {
      await statusMutation.mutateAsync({ id, status, notes }).catch(() => undefined);
    },
    [statusMutation.mutateAsync]
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

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query.refetch]);

  return {
    applications: query.data?.applications ?? NO_APPLICATIONS,
    loading: query.isFetching || statusMutation.isPending,
    error:
      errorOrNull(query.error, 'Failed to fetch applications') ??
      errorOrNull(statusMutation.error, 'Failed to update application status'),
    filter,
    sort,
    pagination: {
      page,
      limit,
      total: query.data?.total ?? 0,
      totalPages: query.data?.totalPages ?? 0,
    },
    updateFilter,
    updateSort,
    changePage,
    changePageSize,
    updateApplicationStatus,
    refetch,
  };
};

type DetailsBundle = {
  application: ApplicationDetail;
  references: ReferenceCheck[];
  homeVisits: HomeVisit[];
  timeline: ApplicationTimeline[];
  // UX P2 G: surface per-section failures independently so a single broken
  // sub-resource doesn't blow away the rest of the modal.
  referencesError: string | null;
  homeVisitsError: string | null;
  timelineError: string | null;
};

type HomeVisitInput = {
  scheduledDate: string;
  scheduledTime: string;
  assignedStaff: string;
  notes?: string;
};

type DetailsChange =
  | { kind: 'reference'; referenceId: string; status: string; notes?: string }
  | { kind: 'schedule-visit'; visitData: HomeVisitInput }
  | { kind: 'update-visit'; visitId: string; updateData: Partial<HomeVisit> }
  | { kind: 'timeline-event'; event: string; description: string; data?: Record<string, unknown> }
  | { kind: 'stage'; action: StageAction; notes?: string };

type Settled<T> = { value: T; error: string | null };

const settle = async <T>(
  promise: Promise<T>,
  fallback: T,
  message: string
): Promise<Settled<T>> => {
  try {
    return { value: await promise, error: null };
  } catch (err) {
    return { value: fallback, error: toErrorMessage(err, message) };
  }
};

const fetchDetailsBundle = async (applicationId: string): Promise<DetailsBundle> => {
  // UX P0/P1 #6 + P2 G: sub-resource failures (timeline, references,
  // home visits) used to either swallow to `[]` or take down the whole
  // modal via Promise.all rejection. They now surface per-section so
  // the rest of the applicant data remains visible.
  const [appData, references, homeVisits, timeline] = await Promise.all([
    applicationServiceInstance.getApplicationById(applicationId),
    settle(
      applicationServiceInstance.getReferenceChecks(applicationId),
      NO_REFERENCES,
      'Failed to load reference checks'
    ),
    settle(
      applicationServiceInstance.getHomeVisits(applicationId),
      NO_HOME_VISITS,
      'Failed to load home visits'
    ),
    settle(
      applicationServiceInstance.getApplicationTimeline(applicationId),
      NO_TIMELINE,
      'Failed to load timeline'
    ),
  ]);

  return {
    // The service returns a looser type than the review modal tolerates.
    application: appData as ApplicationDetail,
    references: references.value,
    homeVisits: homeVisits.value,
    timeline: timeline.value,
    referencesError: references.error,
    homeVisitsError: homeVisits.error,
    timelineError: timeline.error,
  };
};

const applyDetailsChange = (applicationId: string, change: DetailsChange): Promise<unknown> => {
  switch (change.kind) {
    case 'reference':
      return applicationServiceInstance.updateReferenceCheck(
        applicationId,
        change.referenceId,
        change.status,
        change.notes
      );
    case 'schedule-visit':
      return applicationServiceInstance.scheduleHomeVisit(applicationId, change.visitData);
    case 'update-visit':
      return applicationServiceInstance.updateHomeVisit(
        applicationId,
        change.visitId,
        change.updateData
      );
    case 'timeline-event':
      return applicationServiceInstance.addTimelineEvent(
        applicationId,
        change.event,
        change.description,
        change.data
      );
    case 'stage':
      return applicationServiceInstance.transitionStage(
        applicationId,
        change.action.type,
        change.action.nextStage,
        change.notes,
        change.action.data
      );
  }
};

export const useApplicationDetails = (applicationId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['applications', 'rescue-details', applicationId],
    queryFn: () => fetchDetailsBundle(applicationId ?? ''),
    enabled: applicationId !== null,
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: (change: DetailsChange) => applyDetailsChange(applicationId ?? '', change),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['applications', 'rescue-details', applicationId],
      }),
    // Every caller handles a failed change itself (the rejection propagates to
    // it), so opt out of the app-wide generic mutation-failure toast.
    onError: () => undefined,
  });
  const { mutateAsync } = mutation;

  const run = useCallback(
    async (change: DetailsChange) => {
      if (!applicationId) {
        return;
      }
      await mutateAsync(change);
    },
    [applicationId, mutateAsync]
  );

  const updateReferenceCheck = useCallback(
    (referenceId: string, status: string, notes?: string) =>
      run({ kind: 'reference', referenceId, status, notes }),
    [run]
  );

  const scheduleHomeVisit = useCallback(
    (visitData: HomeVisitInput) => run({ kind: 'schedule-visit', visitData }),
    [run]
  );

  const updateHomeVisit = useCallback(
    (visitId: string, updateData: Partial<HomeVisit>) =>
      run({ kind: 'update-visit', visitId, updateData }),
    [run]
  );

  const addTimelineEvent = useCallback(
    (event: string, description: string, data?: Record<string, unknown>) =>
      run({ kind: 'timeline-event', event, description, data }),
    [run]
  );

  // Re-throws on failure so the modal can handle the error itself
  const transitionStage = useCallback(
    (action: StageAction, notes?: string) => run({ kind: 'stage', action, notes }),
    [run]
  );

  const refetch = useCallback(async () => {
    if (applicationId) {
      await queryClient.invalidateQueries({
        queryKey: ['applications', 'rescue-details', applicationId],
      });
    }
  }, [applicationId, queryClient]);

  const bundle = applicationId ? query.data : undefined;

  return {
    application: bundle?.application ?? null,
    references: bundle?.references ?? NO_REFERENCES,
    homeVisits: bundle?.homeVisits ?? NO_HOME_VISITS,
    timeline: bundle?.timeline ?? NO_TIMELINE,
    timelineError: bundle?.timelineError ?? null,
    referencesError: bundle?.referencesError ?? null,
    homeVisitsError: bundle?.homeVisitsError ?? null,
    // Only the first load blocks the review; refetches after a save run in the
    // background so the open review keeps its tab and unsaved input.
    loading: applicationId !== null && query.isLoading,
    // Only a failure to LOAD the application is a load error. A failed change
    // rejects to its caller instead.
    error: errorOrNull(query.error, 'Failed to fetch application details'),
    updateReferenceCheck,
    scheduleHomeVisit,
    updateHomeVisit,
    addTimelineEvent,
    transitionStage,
    refetch,
  };
};
