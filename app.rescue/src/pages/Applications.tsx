import React, { useState } from 'react';
import { useApplications, useApplicationDetails } from '../hooks/useApplications';
import ApplicationList from '../components/applications/ApplicationList';
import ApplicationReview from '../components/applications/ApplicationReview';
import type { ApplicationListItem } from '../types/applications';

const Applications: React.FC = () => {
  const [selectedApplication, setSelectedApplication] = useState<ApplicationListItem | null>(null);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);

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
    refetch
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
    addTimelineEvent
  } = useApplicationDetails(selectedApplication?.id || null);

  const handleApplicationSelect = (application: ApplicationListItem) => {
    setSelectedApplication(application);
  };

  const handleCloseReview = () => {
    setSelectedApplication(null);
  };

  const handleStatusUpdate = async (id: string, status: string, notes?: string) => {
    await updateApplicationStatus(id, status, notes);
    // If we're viewing this application in detail, close the review
    if (selectedApplication?.id === id) {
      setSelectedApplication(null);
    }
  };

  const handleDetailStatusUpdate = async (status: string, notes?: string) => {
    if (selectedApplication) {
      await updateApplicationStatus(selectedApplication.id, status, notes);
      // Refresh the main list
      refetch();
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Application Management</h1>
        <p>Review and process adoption applications with comprehensive workflow tools.</p>
      </div>

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
        onStatusUpdate={handleStatusUpdate}
        selectedApplications={selectedApplications}
        onSelectionChange={setSelectedApplications}
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
          onReferenceUpdate={updateReferenceCheck}
          onScheduleVisit={scheduleHomeVisit}
          onUpdateVisit={updateHomeVisit}
          onAddTimelineEvent={addTimelineEvent}
        />
      )}
    </div>
  );
};

export default Applications;
