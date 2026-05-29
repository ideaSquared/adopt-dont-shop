import { useState, useEffect, useCallback } from 'react';
import { TimelineEvent } from '../components/ApplicationTimeline';
import { apiService } from '@adopt-dont-shop/lib.api';

type TimelineEventsResponse = {
  events: TimelineEvent[];
};

type TimelineStatsPayload = {
  lastActivity?: string;
  totalEvents?: number;
  eventTypeCounts?: {
    stage_change?: number;
    note_added?: number;
  };
};

type TimelineStatsResponse = {
  stats: TimelineStatsPayload;
};

type BulkTimelineStatsResponse = {
  summaries: Record<string, TimelineStatsPayload>;
};

interface UseTimelineWidgetProps {
  applicationId: string;
  maxEvents?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseTimelineWidgetReturn {
  events: TimelineEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasEvents: boolean;
  recentEventCount: number;
}

export function useTimelineWidget({
  applicationId,
  maxEvents = 5,
  autoRefresh = false,
  refreshInterval = 60000, // 1 minute
}: UseTimelineWidgetProps): UseTimelineWidgetReturn {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (cancelled?: { value: boolean }) => {
      try {
        setError(null);
        const data = await apiService.get<TimelineEventsResponse>(
          `/api/applications/${applicationId}/timeline?limit=${maxEvents * 2}`
        );

        if (cancelled?.value) return;
        setEvents(data.events || []);
      } catch (err) {
        if (cancelled?.value) return;
        setError(err instanceof Error ? err.message : 'Failed to load timeline');
        console.error('Timeline widget error:', err);
      } finally {
        if (!cancelled?.value) setLoading(false);
      }
    },
    [applicationId, maxEvents]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchEvents();
  }, [fetchEvents]);

  // Initial load
  useEffect(() => {
    const cancelled = { value: false };
    setLoading(true);
    fetchEvents(cancelled);
    return () => {
      cancelled.value = true;
    };
  }, [fetchEvents]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      fetchEvents();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchEvents]);

  const hasEvents = events.length > 0;
  const recentEventCount = events.length;

  return {
    events,
    loading,
    error,
    refresh,
    hasEvents,
    recentEventCount,
  };
}

// Hook for getting timeline summary data for application cards
interface TimelineSummary {
  totalEvents: number;
  lastActivity: Date | null;
  hasRecentActivity: boolean;
  stageChangeCount: number;
  noteCount: number;
}

interface UseTimelineSummaryProps {
  applicationId: string;
  recentThresholdHours?: number;
}

interface UseTimelineSummaryReturn {
  summary: TimelineSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTimelineSummary({
  applicationId,
  recentThresholdHours = 24,
}: UseTimelineSummaryProps): UseTimelineSummaryReturn {
  const [summary, setSummary] = useState<TimelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (cancelled?: { value: boolean }) => {
      try {
        setError(null);
        const data = await apiService.get<TimelineStatsResponse>(
          `/api/applications/${applicationId}/timeline/stats`
        );

        if (cancelled?.value) return;

        // Transform the stats into our summary format
        const now = new Date();
        const recentThreshold = new Date(now.getTime() - recentThresholdHours * 60 * 60 * 1000);

        const lastActivity = data.stats.lastActivity ? new Date(data.stats.lastActivity) : null;
        const hasRecentActivity = lastActivity ? lastActivity > recentThreshold : false;

        setSummary({
          totalEvents: data.stats.totalEvents || 0,
          lastActivity,
          hasRecentActivity,
          stageChangeCount: data.stats.eventTypeCounts?.stage_change || 0,
          noteCount: data.stats.eventTypeCounts?.note_added || 0,
        });
      } catch (err) {
        if (cancelled?.value) return;
        setError(err instanceof Error ? err.message : 'Failed to load timeline summary');
        console.error('Timeline summary error:', err);
      } finally {
        if (!cancelled?.value) setLoading(false);
      }
    },
    [applicationId, recentThresholdHours]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchSummary();
  }, [fetchSummary]);

  // Initial load
  useEffect(() => {
    const cancelled = { value: false };
    setLoading(true);
    fetchSummary(cancelled);
    return () => {
      cancelled.value = true;
    };
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refresh,
  };
}

// Hook for bulk timeline summaries (for application lists)
interface BulkTimelineSummary {
  [applicationId: string]: TimelineSummary;
}

interface UseBulkTimelineSummariesProps {
  applicationIds: string[];
  recentThresholdHours?: number;
}

interface UseBulkTimelineSummariesReturn {
  summaries: BulkTimelineSummary;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBulkTimelineSummaries({
  applicationIds,
  recentThresholdHours = 24,
}: UseBulkTimelineSummariesProps): UseBulkTimelineSummariesReturn {
  const [summaries, setSummaries] = useState<BulkTimelineSummary>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable key so the effect only re-runs when the actual IDs change.
  const applicationIdsKey = applicationIds.join(',');

  const fetchSummaries = useCallback(
    async (cancelled?: { value: boolean }) => {
      if (applicationIds.length === 0) {
        setSummaries({});
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const data = await apiService.post<BulkTimelineStatsResponse>(
          '/api/applications/timeline/bulk-stats',
          {
            applicationIds,
            recentThresholdHours,
          }
        );

        if (cancelled?.value) return;

        // Transform the bulk stats into our summary format
        const now = new Date();
        const recentThreshold = new Date(now.getTime() - recentThresholdHours * 60 * 60 * 1000);

        const transformedSummaries: BulkTimelineSummary = {};

        for (const [appId, stats] of Object.entries(data.summaries)) {
          const lastActivity = stats.lastActivity ? new Date(stats.lastActivity) : null;
          const hasRecentActivity = lastActivity ? lastActivity > recentThreshold : false;

          transformedSummaries[appId] = {
            totalEvents: stats.totalEvents || 0,
            lastActivity,
            hasRecentActivity,
            stageChangeCount: stats.eventTypeCounts?.stage_change || 0,
            noteCount: stats.eventTypeCounts?.note_added || 0,
          };
        }

        setSummaries(transformedSummaries);
      } catch (err) {
        if (cancelled?.value) return;
        setError(err instanceof Error ? err.message : 'Failed to load timeline summaries');
        console.error('Bulk timeline summaries error:', err);
      } finally {
        if (!cancelled?.value) setLoading(false);
      }
    },
    [applicationIdsKey, recentThresholdHours]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchSummaries();
  }, [fetchSummaries]);

  // Initial load
  useEffect(() => {
    const cancelled = { value: false };
    setLoading(true);
    fetchSummaries(cancelled);
    return () => {
      cancelled.value = true;
    };
  }, [fetchSummaries]);

  return {
    summaries,
    loading,
    error,
    refresh,
  };
}
