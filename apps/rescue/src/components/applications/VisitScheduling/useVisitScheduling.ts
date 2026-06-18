import { useState } from 'react';
import { toast } from '@adopt-dont-shop/lib.components';

type VisitForm = {
  scheduledDate: string;
  scheduledTime: string;
  assignedStaff: string;
  notes: string;
};

type RescheduleForm = {
  scheduledDate: string;
  scheduledTime: string;
  reason: string;
};

type CompleteForm = {
  outcome: 'approved' | 'rejected' | 'conditional' | '';
  notes: string;
  conditions: string;
};

type UseVisitSchedulingProps = {
  onScheduleVisit: (visitData: {
    scheduledDate: string;
    scheduledTime: string;
    assignedStaff: string;
    notes?: string;
  }) => void;
  onUpdateVisit: (visitId: string, updateData: Record<string, unknown>) => void;
  onRefresh?: () => void;
};

const EMPTY_VISIT_FORM: VisitForm = {
  scheduledDate: '',
  scheduledTime: '',
  assignedStaff: '',
  notes: '',
};

const EMPTY_RESCHEDULE_FORM: RescheduleForm = {
  scheduledDate: '',
  scheduledTime: '',
  reason: '',
};

const EMPTY_COMPLETE_FORM: CompleteForm = {
  outcome: '',
  notes: '',
  conditions: '',
};

export const useVisitScheduling = ({
  onScheduleVisit,
  onUpdateVisit,
  onRefresh,
}: UseVisitSchedulingProps) => {
  const [showScheduleVisit, setShowScheduleVisit] = useState(false);
  const [visitForm, setVisitForm] = useState<VisitForm>(EMPTY_VISIT_FORM);
  const [isSchedulingVisit, setIsSchedulingVisit] = useState(false);
  const [editingVisit, setEditingVisit] = useState<string | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleForm>(EMPTY_RESCHEDULE_FORM);
  const [completingVisit, setCompletingVisit] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState<CompleteForm>(EMPTY_COMPLETE_FORM);
  const [viewingVisit, setViewingVisit] = useState<string | null>(null);
  const [cancellingVisit, setCancellingVisit] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const resetForms = () => {
    setShowScheduleVisit(false);
    setEditingVisit(null);
    setCompletingVisit(null);
    setViewingVisit(null);
    setCancellingVisit(null);
    setCancelReason('');
    setVisitForm(EMPTY_VISIT_FORM);
    setRescheduleForm(EMPTY_RESCHEDULE_FORM);
    setCompleteForm(EMPTY_COMPLETE_FORM);
  };

  const handleScheduleVisit = async () => {
    try {
      setIsSchedulingVisit(true);
      await onScheduleVisit({
        scheduledDate: visitForm.scheduledDate,
        scheduledTime: visitForm.scheduledTime,
        assignedStaff: visitForm.assignedStaff,
        notes: visitForm.notes,
      });
      setVisitForm(EMPTY_VISIT_FORM);
      setShowScheduleVisit(false);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to schedule visit:', error);
      toast.error(
        `Failed to schedule visit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: { label: 'Retry', onClick: handleScheduleVisit } }
      );
    } finally {
      setIsSchedulingVisit(false);
    }
  };

  const handleMarkVisitInProgress = async (visitId: string) => {
    try {
      await onUpdateVisit(visitId, {
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      });
      onRefresh?.();
    } catch (error) {
      console.error('Failed to mark visit as in progress:', error);
      toast.error(
        `Failed to mark visit as in progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: { label: 'Retry', onClick: () => handleMarkVisitInProgress(visitId) } }
      );
    }
  };

  const handleRescheduleVisit = async (visitId: string) => {
    try {
      await onUpdateVisit(visitId, {
        scheduledDate: rescheduleForm.scheduledDate,
        scheduledTime: rescheduleForm.scheduledTime,
        notes: rescheduleForm.reason ? `Rescheduled: ${rescheduleForm.reason}` : undefined,
      });
      setRescheduleForm(EMPTY_RESCHEDULE_FORM);
      setEditingVisit(null);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to reschedule visit:', error);
      toast.error(
        `Failed to reschedule visit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: { label: 'Retry', onClick: () => handleRescheduleVisit(visitId) } }
      );
    }
  };

  const handleCompleteVisit = async (visitId: string) => {
    try {
      const updateData: Record<string, unknown> = {
        status: 'completed',
        outcome: completeForm.outcome,
        notes: completeForm.notes,
        completedAt: new Date().toISOString(),
      };
      if (completeForm.outcome === 'conditional' && completeForm.conditions) {
        updateData.conditions = completeForm.conditions;
      }
      await onUpdateVisit(visitId, updateData);
      setCompleteForm(EMPTY_COMPLETE_FORM);
      setCompletingVisit(null);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to complete visit:', error);
      toast.error(
        `Failed to complete visit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: { label: 'Retry', onClick: () => handleCompleteVisit(visitId) } }
      );
    }
  };

  const handleCancelVisit = async (visitId: string) => {
    const reason = cancelReason.trim();
    if (!reason) {
      return;
    }
    try {
      await onUpdateVisit(visitId, {
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date().toISOString(),
      });
      setCancellingVisit(null);
      setCancelReason('');
      onRefresh?.();
    } catch (error) {
      console.error('Failed to cancel visit:', error);
      toast.error(
        `Failed to cancel visit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: { label: 'Retry', onClick: () => handleCancelVisit(visitId) } }
      );
    }
  };

  return {
    showScheduleVisit,
    setShowScheduleVisit,
    visitForm,
    setVisitForm,
    isSchedulingVisit,
    editingVisit,
    setEditingVisit,
    rescheduleForm,
    setRescheduleForm,
    completingVisit,
    setCompletingVisit,
    completeForm,
    setCompleteForm,
    viewingVisit,
    setViewingVisit,
    cancellingVisit,
    setCancellingVisit,
    cancelReason,
    setCancelReason,
    resetForms,
    handleScheduleVisit,
    handleMarkVisitInProgress,
    handleRescheduleVisit,
    handleCompleteVisit,
    handleCancelVisit,
    EMPTY_VISIT_FORM,
    EMPTY_RESCHEDULE_FORM,
    EMPTY_COMPLETE_FORM,
  };
};
