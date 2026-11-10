import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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

type VisitUpdate = {
  visitId: string;
  data: Record<string, unknown>;
  failure: string;
  onDone: () => void;
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

  const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error');

  const scheduleVisit = useMutation({
    mutationFn: async () => {
      await onScheduleVisit({
        scheduledDate: visitForm.scheduledDate,
        scheduledTime: visitForm.scheduledTime,
        assignedStaff: visitForm.assignedStaff,
        notes: visitForm.notes,
      });
    },
    onSuccess: () => {
      setVisitForm(EMPTY_VISIT_FORM);
      setShowScheduleVisit(false);
      onRefresh?.();
    },
    onError: error => {
      console.error('Failed to schedule visit:', error);
      toast.error(`Failed to schedule visit: ${errorText(error)}`, {
        action: { label: 'Retry', onClick: () => scheduleVisit.mutate() },
      });
    },
  });

  // Every other visit action is an update of one visit; each says what to do on
  // success and how to describe a failure.
  const updateVisit = useMutation({
    mutationFn: async ({ visitId, data }: VisitUpdate) => {
      await onUpdateVisit(visitId, data);
    },
    onSuccess: (_result, update) => {
      update.onDone();
      onRefresh?.();
    },
    onError: (error, update) => {
      console.error(`Failed to ${update.failure}:`, error);
      toast.error(`Failed to ${update.failure}: ${errorText(error)}`, {
        action: { label: 'Retry', onClick: () => updateVisit.mutate(update) },
      });
    },
  });

  const handleScheduleVisit = () => scheduleVisit.mutate();

  const handleMarkVisitInProgress = (visitId: string) =>
    updateVisit.mutate({
      visitId,
      data: { status: 'in_progress', startedAt: new Date().toISOString() },
      failure: 'mark visit as in progress',
      onDone: () => undefined,
    });

  const handleRescheduleVisit = (visitId: string) =>
    updateVisit.mutate({
      visitId,
      data: {
        scheduledDate: rescheduleForm.scheduledDate,
        scheduledTime: rescheduleForm.scheduledTime,
        notes: rescheduleForm.reason ? `Rescheduled: ${rescheduleForm.reason}` : undefined,
      },
      failure: 'reschedule visit',
      onDone: () => {
        setRescheduleForm(EMPTY_RESCHEDULE_FORM);
        setEditingVisit(null);
      },
    });

  const handleCompleteVisit = (visitId: string) => {
    const data: Record<string, unknown> = {
      status: 'completed',
      outcome: completeForm.outcome,
      notes: completeForm.notes,
      completedAt: new Date().toISOString(),
      ...(completeForm.outcome === 'conditional' && completeForm.conditions
        ? { conditions: completeForm.conditions }
        : {}),
    };
    updateVisit.mutate({
      visitId,
      data,
      failure: 'complete visit',
      onDone: () => {
        setCompleteForm(EMPTY_COMPLETE_FORM);
        setCompletingVisit(null);
      },
    });
  };

  const handleCancelVisit = (visitId: string) => {
    const reason = cancelReason.trim();
    if (!reason) {
      return;
    }
    updateVisit.mutate({
      visitId,
      data: { status: 'cancelled', cancelReason: reason, cancelledAt: new Date().toISOString() },
      failure: 'cancel visit',
      onDone: () => {
        setCancellingVisit(null);
        setCancelReason('');
      },
    });
  };

  return {
    showScheduleVisit,
    setShowScheduleVisit,
    visitForm,
    setVisitForm,
    isSchedulingVisit: scheduleVisit.isPending,
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
