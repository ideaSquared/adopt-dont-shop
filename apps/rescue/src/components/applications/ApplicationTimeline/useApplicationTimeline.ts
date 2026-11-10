import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@adopt-dont-shop/lib.components';
import { TimelineEventType } from '../../../types/applications';

type UseApplicationTimelineProps = {
  onAddTimelineEvent: (event: string, description: string, data?: Record<string, unknown>) => void;
};

export const useApplicationTimeline = ({ onAddTimelineEvent }: UseApplicationTimelineProps) => {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState(TimelineEventType.NOTE_ADDED);
  const [newEventDescription, setNewEventDescription] = useState('');

  const addEvent = useMutation({
    mutationFn: async (description: string) => {
      await onAddTimelineEvent(newEventType, description);
    },
    onSuccess: () => {
      setNewEventDescription('');
      setNewEventType(TimelineEventType.NOTE_ADDED);
      setShowAddEvent(false);
    },
    onError: error => {
      console.error('Failed to add timeline event:', error);
      toast.error('Failed to add timeline event. Please try again.', {
        action: { label: 'Retry', onClick: handleAddEvent },
      });
    },
  });

  const handleAddEvent = () => {
    if (!newEventDescription.trim()) {
      return;
    }
    addEvent.mutate(newEventDescription.trim());
  };

  return {
    showAddEvent,
    setShowAddEvent,
    newEventType,
    setNewEventType,
    newEventDescription,
    setNewEventDescription,
    isAddingEvent: addEvent.isPending,
    handleAddEvent,
  };
};
