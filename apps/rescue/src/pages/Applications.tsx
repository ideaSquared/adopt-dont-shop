import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router';
import { useApplications, useApplicationDetails } from '../hooks/useApplications';
import ApplicationList from '../components/applications/ApplicationList';
import ApplicationReview from '../components/applications/ApplicationReview';
import BulkActionBar from '../components/applications/BulkActionBar';
import StageCountSummary from '../components/applications/StageCountSummary';
import { applicationService } from '../services/applicationService';
import type { ApplicationListItem } from '../types/applications';
import { buildBulkUpdatePayload, type BulkStageAction } from '../utils/applicationStageTransitions';
import type { StageAction } from '../types/applicationStages';
import * as styles from './Applications.css';

const Applications: React.FC = () => {
  // ADS-644: when deep-linked from a pet card or foster row, scope the
  // application list to that pet via the existing petId filter.
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // ADS D4: `/applications/:id` deep-links straight to an application's review
  // while keeping the in-page master-detail. The route param is the source of
  // truth for which application is open; selecting a row navigates here so the
  // URL is always shareable, and a fresh deep-link opens the review even when
  // the row hasn't been clicked in this session.
  const { id: routeApplicationId } = useParams<{ id: string }>();
  const initialPetId = searchParams.get('petId');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationListItem | null>(null);
  const selectedApplicationId = routeApplicationId ?? selectedApplication?.id ?? null;
  // ADS-642: selection is stored as a map of id → application snapshot
  // so it survives pagination/filter changes (the user can select rows
  // on page 1, paginate to page 2, and the BulkActionBar still knows
  // each row's stage and home-visit status when computing eligibility).
  const [selectedById, setSelectedById] = useState<Map<string, ApplicationListItem>>(new Map());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    successCount: number;
    failedCount: number;
  } | null>(null);

  // Main applications data
  const {
    applications,
    loading: applicationsLoading,
    error: applicationsError,
    filter,
    sort,
    pagination,
    updateFilter,
    updateSort,
    updateApplicationStatus,
    refetch,
  } = useApplications();

  // ADS-644: apply the petId from the URL once on mount so the listing
  // hook fetches the scoped slice. We deliberately don't re-apply on every
  // searchParams change so the user can clear the filter in the UI.
  useEffect(() => {
    if (initialPetId) {
      updateFilter({ petId: initialPetId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only
  }, []);

  // Selected application details
  const {
    application: applicationDetails,
    references,
    homeVisits,
    timeline,
    timelineError,
    referencesError,
    homeVisitsError,
    loading: detailsLoading,
    error: detailsError,
    updateReferenceCheck,
    scheduleHomeVisit,
    updateHomeVisit,
    addTimelineEvent,
    transitionStage,
    refetch: refetchApplicationDetails,
  } = useApplicationDetails(selectedApplicationId);

  const handleApplicationSelect = (application: ApplicationListItem) => {
    setSelectedApplication(application);
    // Reflect the open application in the URL so staff can share a link to it.
    navigate(`/applications/${application.id}`);
  };

  const handleCloseReview = () => {
    setSelectedApplication(null);
    navigate('/applications');
  };

  const handleDetailStatusUpdate = async (status: string, notes?: string) => {
    if (selectedApplicationId) {
      await updateApplicationStatus(selectedApplicationId, status, notes);
      // Refresh both the main list and the application details
      refetch();
      refetchApplicationDetails();
    }
  };

  const handleStageTransition = async (action: StageAction, notes?: string) => {
    if (selectedApplicationId) {
      await transitionStage(action, notes);
      // Refresh both the main list and the application details
      refetch();
      refetchApplicationDetails();
    }
  };

  // Derive the filtered pet name when a petId filter is active.
  const filteredPetName = useMemo(() => {
    if (!filter.petId) {
      return null;
    }
    const match = applications.find(a => a.petId === filter.petId);
    return match?.petName ?? filter.petId;
  }, [filter.petId, applications]);

  const clearPetFilter = () => {
    const { petId: _removed, ...rest } = filter;
    updateFilter(rest);
    // Remove the petId from the URL without a full navigation
    navigate('/applications', { replace: true });
  };

  // ADS-642: derive the Set passed to ApplicationList from the
  // selection map. The list only owns the id-level toggles; this page
  // tracks the full snapshot so the BulkActionBar can compute
  // preconditions on rows that may no longer be on the current page.
  const selectedIds = useMemo(() => new Set(selectedById.keys()), [selectedById]);

  const updateSelection = (next: Set<string>) => {
    // Merge: keep snapshots for ids that are still selected, learn new
    // snapshots from rows currently rendered. Rows selected on previous
    // pages that aren't in `applications` keep their stored snapshot.
    const nextMap = new Map<string, ApplicationListItem>();
    for (const id of next) {
      const existing = selectedById.get(id);
      const fresh = applications.find(a => a.id === id);
      const snapshot = fresh ?? existing;
      if (snapshot) {
        nextMap.set(id, snapshot);
      }
    }
    setSelectedById(nextMap);
  };

  const handleBulkAction = async (
    action: BulkStageAction,
    eligibleIds: string[],
    reason?: string
  ) => {
    setBulkBusy(true);
    setBulkResult(null);
    try {
      // Group eligible rows by the payload shape we'd POST so we issue
      // one bulk-update call per distinct target stage (e.g. all rows
      // advancing to REVIEWING vs. all rows advancing to VISITING).
      const groups = new Map<
        string,
        { applicationIds: string[]; updates: Record<string, unknown> }
      >();
      for (const id of eligibleIds) {
        const app = selectedById.get(id);
        if (!app) {
          continue;
        }
        const payload = buildBulkUpdatePayload(action, app, reason);
        const key = JSON.stringify(payload);
        const existing = groups.get(key);
        if (existing) {
          existing.applicationIds.push(id);
        } else {
          groups.set(key, { applicationIds: [id], updates: payload });
        }
      }
      const result = await applicationService.performBulkUpdates(Array.from(groups.values()));
      setBulkResult({
        successCount: result.successCount,
        failedCount: result.failureCount,
      });
      setSelectedById(new Map());
      refetch();
    } catch {
      setBulkResult({ successCount: 0, failedCount: eligibleIds.length });
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Application Management</h1>
        <p>Review and process adoption applications.</p>
      </div>

      {filteredPetName && (
        <div data-testid="pet-filter-banner" className={styles.petFilterBanner}>
          <span>
            Filtered by: <strong>{filteredPetName}</strong>
          </span>
          <button type="button" onClick={clearPetFilter} className={styles.petFilterClearButton}>
            Clear filter
          </button>
        </div>
      )}

      <StageCountSummary applications={applications} />

      <BulkActionBar
        selectedApplications={Array.from(selectedById.values())}
        onClearSelection={() => {
          setSelectedById(new Map());
          setBulkResult(null);
        }}
        busy={bulkBusy}
        resultSummary={bulkResult}
        onBulkAction={handleBulkAction}
        onResultDismiss={() => setBulkResult(null)}
      />

      {/* Applications List */}
      <ApplicationList
        applications={applications}
        loading={applicationsLoading}
        error={applicationsError}
        filter={filter}
        sort={sort}
        pagination={pagination}
        onFilterChange={updateFilter}
        onSortChange={updateSort}
        onApplicationSelect={handleApplicationSelect}
        selectedIds={selectedIds}
        onSelectionChange={updateSelection}
      />

      {/* Application Review Modal */}
      {selectedApplicationId && applicationDetails && (
        <ApplicationReview
          application={applicationDetails}
          references={references}
          homeVisits={homeVisits}
          timeline={timeline}
          timelineError={timelineError}
          referencesError={referencesError}
          homeVisitsError={homeVisitsError}
          loading={detailsLoading}
          error={detailsError}
          onClose={handleCloseReview}
          onStatusUpdate={handleDetailStatusUpdate}
          onStageTransition={handleStageTransition}
          onReferenceUpdate={updateReferenceCheck}
          onScheduleVisit={scheduleHomeVisit}
          onUpdateVisit={updateHomeVisit}
          onAddTimelineEvent={addTimelineEvent}
          onRefresh={refetchApplicationDetails}
        />
      )}
    </div>
  );
};

export default Applications;
