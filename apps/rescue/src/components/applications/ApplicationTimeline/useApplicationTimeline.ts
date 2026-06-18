import { useState } from 'react';
import { toast } from '@adopt-dont-shop/lib.components';
import { TimelineEventType } from '../../../types/applications';

type UseApplicationTimelineProps = {
  onAddTimelineEvent: (event: string, description: string, data?: Record<string, unknown>) => void;
};

export const useApplicationTimeline = ({ onAddTimelineEvent }: UseApplicationTimelineProps) => {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState(TimelineEventType.NOTE_ADDED);
  const [newEventDescription, setNewEventDescription] = useState('');
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  const handleAddEvent = async () => {
    if (!newEventDescription.trim()) {
      return;
    }
    try {
      setIsAddingEvent(true);
      await onAddTimelineEvent(newEventType, newEventDescription.trim());
      setNewEventDescription('');
      setNewEventType(TimelineEventType.NOTE_ADDED);
      setShowAddEvent(false);
    } catch (error) {
      console.error('Failed to add timeline event:', error);
      toast.error('Failed to add timeline event. Please try again.', {
        action: { label: 'Retry', onClick: handleAddEvent },
      });
    } finally {
      setIsAddingEvent(false);
    }
  };

  return {
    showAddEvent,
    setShowAddEvent,
    newEventType,
    setNewEventType,
    newEventDescription,
    setNewEventDescription,
    isAddingEvent,
    handleAddEvent,
  };
};
