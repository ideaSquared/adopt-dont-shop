import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@adopt-dont-shop/lib.components';

type ReferenceUpdateState = {
  status: string;
  notes: string;
  showForm: boolean;
};

type UseReferenceChecksProps = {
  onReferenceUpdate: (referenceId: string, status: string, notes?: string) => void;
};

export const useReferenceChecks = ({ onReferenceUpdate }: UseReferenceChecksProps) => {
  const [referenceUpdates, setReferenceUpdates] = useState<Record<string, ReferenceUpdateState>>(
    {}
  );

  const updateReference = useMutation({
    mutationFn: async (vars: { referenceId: string; status: string; notes: string }) => {
      await onReferenceUpdate(vars.referenceId, vars.status, vars.notes);
    },
    onSuccess: (_data, { referenceId, status, notes }) => {
      setReferenceUpdates(prev => ({
        ...prev,
        [referenceId]: {
          ...prev[referenceId],
          showForm: false,
          status,
          notes,
        },
      }));
    },
    onError: (error, vars) => {
      console.error('Failed to update reference:', error);
      toast.error(
        `Failed to update reference: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: { label: 'Retry', onClick: () => updateReference.mutate(vars) } }
      );
    },
  });

  const handleReferenceUpdate = (referenceId: string, status: string, notes: string) =>
    updateReference.mutate({ referenceId, status, notes });

  const toggleReferenceForm = (referenceId: string) => {
    setReferenceUpdates(prev => ({
      ...prev,
      [referenceId]: {
        status: prev[referenceId]?.status || 'pending',
        notes: prev[referenceId]?.notes || '',
        showForm: !prev[referenceId]?.showForm,
      },
    }));
  };

  const updateReferenceField = (referenceId: string, field: 'status' | 'notes', value: string) => {
    setReferenceUpdates(prev => ({
      ...prev,
      [referenceId]: {
        ...prev[referenceId],
        [field]: value,
      },
    }));
  };

  const resetReferenceUpdates = () => {
    setReferenceUpdates({});
  };

  return {
    referenceUpdates,
    handleReferenceUpdate,
    toggleReferenceForm,
    updateReferenceField,
    resetReferenceUpdates,
  };
};
