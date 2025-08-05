import { useState, useEffect, useCallback } from 'react';
import { TimelineEvent, TimelineEventType } from '../components/ApplicationTimeline';

interface TimelineStats {
  total_events: number;
  events_by_type: Record<TimelineEventType, number>;
  first_event: string | null;
  last_event: string | null;
  staff_activity: Record<string, number>;
}

interface UseApplicationTimelineResult {
  events: TimelineEvent[];
  stats: TimelineStats | null;
  loading: boolean;
  error: string | null;
  addNote: (note: string, noteType: string) => Promise<void>;
  refreshTimeline: () => Promise<void>;
}

export function useApplicationTimeline(applicationId: string): UseApplicationTimelineResult {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!applicationId) return;

    try {
      setLoading(true);

      // Fetch timeline events
      const timelineResponse = await fetch(`/api/applications/${applicationId}/timeline`);

      if (!timelineResponse.ok) {
        throw new Error('Failed to fetch timeline');
      }

      const timelineData = await timelineResponse.json();

      if (timelineData.success) {
        setEvents(timelineData.data || []);
      } else {
        throw new Error(timelineData.error || 'Failed to fetch timeline');
      }

      // Fetch timeline stats
      const statsResponse = await fetch(`/api/applications/${applicationId}/timeline/stats`);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching timeline:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  const addNote = useCallback(
    async (note: string, noteType: string = 'general') => {
      if (!applicationId || !note.trim()) return;

      try {
        const response = await fetch(`/api/applications/${applicationId}/timeline/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            note_type: noteType,
            content: note.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to add note');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to add note');
        }

        // Refresh timeline to show new note
        await fetchTimeline();
      } catch (err) {
        console.error('Error adding note:', err);
        throw err;
      }
    },
    [applicationId, fetchTimeline]
  );

  const refreshTimeline = useCallback(async () => {
    await fetchTimeline();
  }, [fetchTimeline]);

  useEffect(() => {
    if (applicationId) {
      fetchTimeline();
    }
  }, [applicationId, fetchTimeline]);

  return {
    events,
    stats,
    loading,
    error,
    addNote,
    refreshTimeline,
  };
}

// Hook for creating timeline events programmatically
export function useTimelineEvents() {
  const createStageChangeEvent = useCallback(
    async (
      applicationId: string,
      previousStage: string | null,
      newStage: string,
      metadata?: Record<string, any>
    ) => {
      try {
        const response = await fetch(`/api/applications/${applicationId}/timeline/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: TimelineEventType.STAGE_CHANGE,
            title: `Stage changed from ${previousStage || 'None'} to ${newStage}`,
            description: `Application moved to ${newStage} stage`,
            metadata: {
              previous_stage: previousStage,
              new_stage: newStage,
              ...metadata,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create stage change event');
        }

        return await response.json();
      } catch (err) {
        console.error('Error creating stage change event:', err);
        throw err;
      }
    },
    []
  );

  const createHomeVisitEvent = useCallback(
    async (
      applicationId: string,
      eventType: 'scheduled' | 'completed' | 'rescheduled' | 'cancelled',
      visitDate?: Date,
      outcome?: 'positive' | 'negative',
      notes?: string
    ) => {
      const eventMap = {
        scheduled: TimelineEventType.HOME_VISIT_SCHEDULED,
        completed: TimelineEventType.HOME_VISIT_COMPLETED,
        rescheduled: TimelineEventType.HOME_VISIT_RESCHEDULED,
        cancelled: TimelineEventType.HOME_VISIT_CANCELLED,
      };

      const titleMap = {
        scheduled: 'Home visit scheduled',
        completed: `Home visit completed${outcome ? ` - ${outcome}` : ''}`,
        rescheduled: 'Home visit rescheduled',
        cancelled: 'Home visit cancelled',
      };

      try {
        const response = await fetch(`/api/applications/${applicationId}/timeline/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: eventMap[eventType],
            title: titleMap[eventType],
            description:
              notes ||
              `Home visit ${eventType}${visitDate ? ` for ${visitDate.toLocaleDateString()}` : ''}`,
            metadata: {
              event_type: eventType,
              visit_date: visitDate?.toISOString(),
              outcome,
              notes,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create home visit ${eventType} event`);
        }

        return await response.json();
      } catch (err) {
        console.error(`Error creating home visit ${eventType} event:`, err);
        throw err;
      }
    },
    []
  );

  const createDecisionEvent = useCallback(
    async (
      applicationId: string,
      decision: 'approved' | 'conditional' | 'rejected',
      reason?: string
    ) => {
      const eventTypeMap = {
        approved: TimelineEventType.APPLICATION_APPROVED,
        conditional: TimelineEventType.APPLICATION_APPROVED,
        rejected: TimelineEventType.APPLICATION_REJECTED,
      };

      try {
        const response = await fetch(`/api/applications/${applicationId}/timeline/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: eventTypeMap[decision],
            title: `Application ${decision}`,
            description: reason || `Application has been ${decision}`,
            metadata: {
              decision,
              reason,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create decision event');
        }

        return await response.json();
      } catch (err) {
        console.error('Error creating decision event:', err);
        throw err;
      }
    },
    []
  );

  return {
    createStageChangeEvent,
    createHomeVisitEvent,
    createDecisionEvent,
  };
}
