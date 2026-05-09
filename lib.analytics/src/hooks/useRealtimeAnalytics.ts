import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
 * Targets `@tanstack/react-query` ^5 to match the existing apps.
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
    // Socket.IO v4's typed `on`/`off` reject anything that isn't on the
    // server's typed event map. We trust the EventMap contract here and
    // address the bus through the untyped surface.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const untyped = s as unknown as {
      on: (e: string, cb: any) => void;
      off: (e: string, cb: any) => void;
    };
    untyped.on(event, handler);
    return () => {
      untyped.off(event, handler);
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
        qc.invalidateQueries({ queryKey: ['analytics', cat] });
      }
      qc.invalidateQueries({ queryKey: ['reports'] });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const untyped = s as unknown as {
      on: (e: string, cb: any) => void;
      off: (e: string, cb: any) => void;
    };
    untyped.on('analytics:invalidate', handler);
    return () => {
      untyped.off('analytics:invalidate', handler);
    };
  }, [qc]);
};
