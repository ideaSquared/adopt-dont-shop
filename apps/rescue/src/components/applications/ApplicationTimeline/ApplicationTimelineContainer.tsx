import React from 'react';
import type { ApplicationTimeline as ApplicationTimelineItem } from '../../../types/applications';
import { useApplicationTimeline } from './useApplicationTimeline';
import { ApplicationTimeline } from './ApplicationTimeline';

type ApplicationTimelineContainerProps = {
  timeline: ApplicationTimelineItem[];
  timelineError?: string | null;
  onAddTimelineEvent: (event: string, description: string, data?: Record<string, unknown>) => void;
};

export const ApplicationTimelineContainer: React.FC<ApplicationTimelineContainerProps> = ({
  timeline,
  timelineError,
  onAddTimelineEvent,
}) => {
  const {
    showAddEvent,
    setShowAddEvent,
    newEventType,
    setNewEventType,
    newEventDescription,
    setNewEventDescription,
    isAddingEvent,
    handleAddEvent,
  } = useApplicationTimeline({ onAddTimelineEvent });

  return (
    <ApplicationTimeline
      timeline={timeline}
      timelineError={timelineError}
      showAddEvent={showAddEvent}
      setShowAddEvent={setShowAddEvent}
      newEventType={newEventType}
      setNewEventType={setNewEventType}
      newEventDescription={newEventDescription}
      setNewEventDescription={setNewEventDescription}
      isAddingEvent={isAddingEvent}
      onAddEvent={handleAddEvent}
    />
  );
};
