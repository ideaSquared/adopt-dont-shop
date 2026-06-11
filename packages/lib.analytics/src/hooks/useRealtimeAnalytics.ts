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

/**
 * Reset the module-level singleton state.
 *
 * Disconnects the current socket, nulls both singletons, and is
 * intentionally exported so that tests can tear down between test cases
 * without leaking a connected socket across user sessions.
 *
 * In production, prefer {@link setRealtimeAnalyticsToken} with `null`
 * to disconnect on logout; this function is primarily for test teardown.
 */
export const resetRealtimeAnalytics = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  pendingToken = null;
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

/** ADS C4-5: pushed to user:{id} when an application's status changes. */
export type ApplicationStatusChangedPayload = {
  applicationId: string;
  status: string;
  stage?: string;
  updatedAt: string;
};

/** ADS C4-6: pushed to rescue:{id} when an application is created / updated. */
export type ApplicationListChangePayload = {
  applicationId: string;
};

/** ADS C4-3: pushed to rescue:{id} when an admin verifies the rescue. */
export type RescueVerifiedPayload = {
  rescueId: string;
  verifiedAt: string;
};

type EventMap = {
  'analytics:invalidate': AnalyticsInvalidatePayload;
  'analytics:metric-update': AnalyticsMetricUpdatePayload;
  'reports:scheduled-run-complete': ReportsScheduledRunCompletePayload;
  application_status_changed: ApplicationStatusChangedPayload;
  application_created: ApplicationListChangePayload;
  application_updated: ApplicationListChangePayload;
  'rescue:verified': RescueVerifiedPayload;
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
    // Socket.IO v4 types the `on`/`off` overloads against its own server-side
    // EventsMap, which does not include our application EventMap. We access the
    // bus through the untyped string-keyed surface so TypeScript does not reject
    // our custom event names. This is a justified single cast: the runtime
    // contract is enforced by EventMap above; no double-cast is needed.
    type UntypedBus = {
      on(e: string, cb: (...a: unknown[]) => void): void;
      off(e: string, cb: (...a: unknown[]) => void): void;
    };
    const bus = s as unknown as UntypedBus;
    bus.on(event, handler as (...args: unknown[]) => void);
    return () => {
      bus.off(event, handler as (...args: unknown[]) => void);
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
    // Same justified single cast as in useRealtimeAnalytics (see comment above).
    type UntypedBus = {
      on(e: string, cb: (...a: unknown[]) => void): void;
      off(e: string, cb: (...a: unknown[]) => void): void;
    };
    const bus = s as unknown as UntypedBus;
    bus.on('analytics:invalidate', handler as (...args: unknown[]) => void);
    return () => {
      bus.off('analytics:invalidate', handler as (...args: unknown[]) => void);
    };
  }, [qc]);
};
