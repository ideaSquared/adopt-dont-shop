import React, { useState } from 'react';
import { useApplications, useApplicationDetails } from '../hooks/useApplications';
import ApplicationList from '../components/applications/ApplicationList';
import ApplicationReview from '../components/applications/ApplicationReview';
import BulkActionBar from '../components/applications/BulkActionBar';
import { applicationService } from '../services/applicationService';
import type { ApplicationListItem } from '../types/applications';

const Applications: React.FC = () => {
  const [selectedApplication, setSelectedApplication] = useState<ApplicationListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  // Selected application details
  const {
    application: applicationDetails,
    references,
    homeVisits,
    timeline,
    loading: detailsLoading,
    error: detailsError,
    updateReferenceCheck,
    scheduleHomeVisit,
    updateHomeVisit,
    addTimelineEvent,
    transitionStage,
    refetch: refetchApplicationDetails,
  } = useApplicationDetails(selectedApplication?.id || null);

  const handleApplicationSelect = (application: ApplicationListItem) => {
    setSelectedApplication(application);
  };

  const handleCloseReview = () => {
    setSelectedApplication(null);
  };

  const handleDetailStatusUpdate = async (status: string, notes?: string) => {
    if (selectedApplication) {
      await updateApplicationStatus(selectedApplication.id, status, notes);
      // Refresh both the main list and the application details
      refetch();
      refetchApplicationDetails();
    }
  };

  const handleStageTransition = async (action: any, notes?: string) => {
    if (selectedApplication) {
      await transitionStage(action, notes);
      // Refresh both the main list and the application details
      refetch();
      refetchApplicationDetails();
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Application Management</h1>
        <p>Review and process adoption applications.</p>
      </div>

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => {
          setSelectedIds(new Set());
          setBulkResult(null);
        }}
        busy={bulkBusy}
        resultSummary={bulkResult}
        onBulkAction={async (action, reason) => {
          setBulkBusy(true);
          setBulkResult(null);
          try {
            const result = await applicationService.performBulkAction({
              type: action,
              applicationIds: Array.from(selectedIds),
              data: reason ? { reason } : undefined,
            });
            setBulkResult({
              successCount: result?.successCount ?? selectedIds.size,
              failedCount: result?.failureCount ?? 0,
            });
            setSelectedIds(new Set());
            refetch();
          } catch (err) {
            setBulkResult({ successCount: 0, failedCount: selectedIds.size });
          } finally {
            setBulkBusy(false);
          }
        }}
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
        onSelectionChange={setSelectedIds}
      />

      {/* Application Review Modal */}
      {selectedApplication && (
        <ApplicationReview
          application={applicationDetails}
          references={references}
          homeVisits={homeVisits}
          timeline={timeline}
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
