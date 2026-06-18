import React from 'react';
import type { HomeVisit } from '../../../types/applications';
import type { StaffMember } from '../../../services/staffService';
import { useVisitScheduling } from './useVisitScheduling';
import { VisitScheduling } from './VisitScheduling';

type VisitSchedulingContainerProps = {
  homeVisits: HomeVisit[];
  homeVisitsError?: string | null;
  staff: StaffMember[];
  staffLoading: boolean;
  onScheduleVisit: (visitData: {
    scheduledDate: string;
    scheduledTime: string;
    assignedStaff: string;
    notes?: string;
  }) => void;
  onUpdateVisit: (visitId: string, updateData: Record<string, unknown>) => void;
  onRefresh?: () => void;
};

export const VisitSchedulingContainer: React.FC<VisitSchedulingContainerProps> = ({
  homeVisits,
  homeVisitsError,
  staff,
  staffLoading,
  onScheduleVisit,
  onUpdateVisit,
  onRefresh,
}) => {
  const scheduling = useVisitScheduling({ onScheduleVisit, onUpdateVisit, onRefresh });

  return (
    <VisitScheduling
      homeVisits={homeVisits}
      homeVisitsError={homeVisitsError}
      staff={staff}
      staffLoading={staffLoading}
      showScheduleVisit={scheduling.showScheduleVisit}
      setShowScheduleVisit={scheduling.setShowScheduleVisit}
      visitForm={scheduling.visitForm}
      setVisitForm={scheduling.setVisitForm}
      isSchedulingVisit={scheduling.isSchedulingVisit}
      editingVisit={scheduling.editingVisit}
      setEditingVisit={scheduling.setEditingVisit}
      rescheduleForm={scheduling.rescheduleForm}
      setRescheduleForm={scheduling.setRescheduleForm}
      completingVisit={scheduling.completingVisit}
      setCompletingVisit={scheduling.setCompletingVisit}
      completeForm={scheduling.completeForm}
      setCompleteForm={scheduling.setCompleteForm}
      viewingVisit={scheduling.viewingVisit}
      setViewingVisit={scheduling.setViewingVisit}
      cancellingVisit={scheduling.cancellingVisit}
      setCancellingVisit={scheduling.setCancellingVisit}
      cancelReason={scheduling.cancelReason}
      setCancelReason={scheduling.setCancelReason}
      emptyVisitForm={scheduling.EMPTY_VISIT_FORM}
      emptyRescheduleForm={scheduling.EMPTY_RESCHEDULE_FORM}
      emptyCompleteForm={scheduling.EMPTY_COMPLETE_FORM}
      onScheduleVisit={scheduling.handleScheduleVisit}
      onMarkVisitInProgress={scheduling.handleMarkVisitInProgress}
      onRescheduleVisit={scheduling.handleRescheduleVisit}
      onCompleteVisit={scheduling.handleCompleteVisit}
      onCancelVisit={scheduling.handleCancelVisit}
    />
  );
};
