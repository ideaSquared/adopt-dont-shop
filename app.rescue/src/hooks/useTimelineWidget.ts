import { useState, useEffect } from 'react';
import { TimelineEvent } from '../components/ApplicationTimeline';
import { apiService } from '@adopt-dont-shop/lib-api';

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

  const fetchEvents = async () => {
    try {
      setError(null);
      const data = await apiService.get<any>(
        `/api/applications/${applicationId}/timeline?limit=${maxEvents * 2}`
      );

      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
      console.error('Timeline widget error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    await fetchEvents();
  };

  // Initial load
  useEffect(() => {
    fetchEvents();
  }, [applicationId, maxEvents]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(fetchEvents, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, applicationId, maxEvents]);

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

  const fetchSummary = async () => {
    try {
      setError(null);
      const data = await apiService.get<any>(`/api/applications/${applicationId}/timeline/stats`);

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
      setError(err instanceof Error ? err.message : 'Failed to load timeline summary');
      console.error('Timeline summary error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    await fetchSummary();
  };

  // Initial load
  useEffect(() => {
    fetchSummary();
  }, [applicationId, recentThresholdHours]);

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

  const fetchSummaries = async () => {
    if (applicationIds.length === 0) {
      setSummaries({});
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await apiService.post<any>('/api/applications/timeline/bulk-stats', {
        applicationIds,
        recentThresholdHours,
      });

      // Transform the bulk stats into our summary format
      const now = new Date();
      const recentThreshold = new Date(now.getTime() - recentThresholdHours * 60 * 60 * 1000);

      const transformedSummaries: BulkTimelineSummary = {};

      for (const [appId, stats] of Object.entries(data.summaries)) {
        const statsData = stats as any;
        const lastActivity = statsData.lastActivity ? new Date(statsData.lastActivity) : null;
        const hasRecentActivity = lastActivity ? lastActivity > recentThreshold : false;

        transformedSummaries[appId] = {
          totalEvents: statsData.totalEvents || 0,
          lastActivity,
          hasRecentActivity,
          stageChangeCount: statsData.eventTypeCounts?.stage_change || 0,
          noteCount: statsData.eventTypeCounts?.note_added || 0,
        };
      }

      setSummaries(transformedSummaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline summaries');
      console.error('Bulk timeline summaries error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    await fetchSummaries();
  };

  // Initial load
  useEffect(() => {
    fetchSummaries();
  }, [applicationIds.join(','), recentThresholdHours]);

  return {
    summaries,
    loading,
    error,
    refresh,
  };
}
