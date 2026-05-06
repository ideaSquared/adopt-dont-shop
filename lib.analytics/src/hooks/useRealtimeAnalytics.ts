import { useEffect } from 'react';
import { useQueryClient } from 'react-query';
import { io, type Socket } from 'socket.io-client';

/**
 * ADS-105: Socket.IO client subscription helpers.
 *
 * One singleton connection per process — every hook that needs a
 * subscription shares the same socket. The socket is connected on
 * first use and authenticated against the backend's existing JWT
 * handshake middleware.
 *
 * `useRealtimeAnalytics` lets components react to specific events.
 * `useAnalyticsInvalidator` is the common case: invalidate React
 * Query caches when the backend says metrics changed.
 *
 * Targets `react-query` ^3.39 to match the existing apps.
 */

let socket: Socket | null = null;
let pendingToken: string | null = null;

const getSocket = (): Socket | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!socket && pendingToken) {
    socket = io({ auth: { token: pendingToken }, transports: ['websocket', 'polling'] });
  }
  return socket;
};

/**
 * Set the JWT used for socket auth. Call this from the app's auth
 * provider whenever the access token rotates.
 */
export const setRealtimeAnalyticsToken = (token: string | null): void => {
  pendingToken = token;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (token && typeof window !== 'undefined') {
    socket = io({ auth: { token }, transports: ['websocket', 'polling'] });
  }
};

export type AnalyticsInvalidatePayload = {
  rescueId: string | null;
  categories: string[];
};

export type AnalyticsMetricUpdatePayload = {
  rescueId: string | null;
  metric: string;
  scope: 'rescue' | 'platform';
  delta?: number;
  value?: number;
  ts: string;
};

export type ReportsScheduledRunCompletePayload = {
  savedReportId: string;
  scheduleId: string;
  status: 'success' | 'failed';
  ts: string;
};

type EventMap = {
  'analytics:invalidate': AnalyticsInvalidatePayload;
  'analytics:metric-update': AnalyticsMetricUpdatePayload;
  'reports:scheduled-run-complete': ReportsScheduledRunCompletePayload;
};

export const useRealtimeAnalytics = <K extends keyof EventMap>(
  event: K,
  handler: (payload: EventMap[K]) => void
): void => {
  useEffect(() => {
    const s = getSocket();
    if (!s) {
      return;
    }
    s.on(event, handler as (payload: EventMap[K]) => void);
    return () => {
      s.off(event, handler as (payload: EventMap[K]) => void);
    };
  }, [event, handler]);
};

/**
 * Mount once at app root. On `analytics:invalidate`, calls
 * `queryClient.invalidateQueries` for both the analytics namespace
 * (existing dashboards) and the reports namespace (executed payloads).
 */
export const useAnalyticsInvalidator = (): void => {
  const qc = useQueryClient();
  useEffect(() => {
    const s = getSocket();
    if (!s) {
      return;
    }
    const handler = (payload: AnalyticsInvalidatePayload): void => {
      for (const cat of payload.categories) {
        qc.invalidateQueries(['analytics', cat]);
      }
      qc.invalidateQueries('reports');
    };
    s.on('analytics:invalidate', handler);
    return () => {
      s.off('analytics:invalidate', handler);
    };
  }, [qc]);
};
