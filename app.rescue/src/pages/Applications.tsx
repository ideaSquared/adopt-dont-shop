import React, { useState } from 'react';
import { useApplications, useApplicationDetails } from '../hooks/useApplications';
import ApplicationList from '../components/applications/ApplicationList';
import ApplicationKanbanBoard from '../components/applications/ApplicationKanbanBoard';
import ApplicationReview from '../components/applications/ApplicationReview';
import type { ApplicationListItem } from '../types/applications';
import styled from 'styled-components';

type ViewMode = 'list' | 'kanban';

const ViewToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const ViewButton = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#6b7280'};
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#2563eb' : '#f8fafc'};
  }
`;

const Applications: React.FC = () => {
  const [selectedApplication, setSelectedApplication] = useState<ApplicationListItem | null>(null);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban'); // Default to new Kanban view

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
    addTimelineEvent,
    refetch: refetchApplicationDetails
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
      // Refresh both the main list and the application details
      refetch();
      refetchApplicationDetails();
    }
  };

  const handleStageAction = async (applicationId: string, action: string, data?: any) => {
    // Handle stage-based actions - this would integrate with your workflow service
    console.log('Stage action:', { applicationId, action, data });
    // For now, we'll just call the existing status update
    // In a full implementation, you'd have a dedicated workflow service
    await updateApplicationStatus(applicationId, action.toLowerCase(), `Stage action: ${action}`);
    refetch();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Application Management</h1>
        <p>Review and process adoption applications with comprehensive workflow tools.</p>
      </div>

      {/* View Toggle */}
      <ViewToggle>
        <ViewButton 
          active={viewMode === 'kanban'} 
          onClick={() => setViewMode('kanban')}
        >
          📋 Kanban Board
        </ViewButton>
        <ViewButton 
          active={viewMode === 'list'} 
          onClick={() => setViewMode('list')}
        >
          📋 List View
        </ViewButton>
      </ViewToggle>

      {/* Applications Views */}
      {viewMode === 'kanban' ? (
        <ApplicationKanbanBoard
          applications={applications}
          onApplicationSelect={handleApplicationSelect}
          onStageAction={handleStageAction}
          loading={applicationsLoading}
        />
      ) : (
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
      )}

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
          onRefresh={refetchApplicationDetails}
        />
      )}
    </div>
  );
};

export default Applications;
