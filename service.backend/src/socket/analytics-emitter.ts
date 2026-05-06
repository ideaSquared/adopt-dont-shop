import { z } from 'zod';
import type { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

/**
 * ADS-105: Server-to-client analytics events.
 *
 * Mutations across the codebase (Application created, Pet adopted,
 * etc.) call into this emitter. Events fan out to scoped rooms which
 * frontends join at handshake time based on JWT permissions:
 *
 *   analytics:rescue:{rescueId}  — rescue staff
 *   analytics:platform           — platform-wide admins
 *   user:{userId}                — personal notifications
 *
 * High-frequency mutations (chat messages) are debounced server-side
 * to one `analytics:invalidate` per rescue per category every 5s so
 * we don't flood subscribers.
 */

export const analyticsInvalidatePayload = z.object({
  rescueId: z.string().uuid().nullable(),
  categories: z.array(z.string()).min(1),
});
export const analyticsMetricUpdatePayload = z.object({
  rescueId: z.string().uuid().nullable(),
  metric: z.string(),
  scope: z.enum(['rescue', 'platform']),
  delta: z.number().optional(),
  value: z.number().optional(),
  ts: z.string(),
});
export const reportsScheduledRunCompletePayload = z.object({
  savedReportId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  status: z.enum(['success', 'failed']),
  ts: z.string(),
});

let liveIo: SocketIOServer | null = null;
const debounceMap = new Map<string, number>();
const DEBOUNCE_MS = 5_000;

export const setAnalyticsIo = (io: SocketIOServer | null): void => {
  liveIo = io;
};

const room = (rescueId: string | null): string =>
  rescueId === null ? 'analytics:platform' : `analytics:rescue:${rescueId}`;

const debounceKey = (rescueId: string | null, category: string): string =>
  `${rescueId ?? 'platform'}:${category}`;

/**
 * Emit `analytics:invalidate` to the appropriate room. Debounced per
 * (rescueId, category) so chat-heavy mutations don't flood the bus.
 */
export const emitAnalyticsInvalidate = (rescueId: string | null, categories: string[]): void => {
  if (!liveIo) {
    return;
  }
  const now = Date.now();
  const due = categories.filter(cat => {
    const key = debounceKey(rescueId, cat);
    const last = debounceMap.get(key) ?? 0;
    if (now - last < DEBOUNCE_MS) {
      return false;
    }
    debounceMap.set(key, now);
    return true;
  });
  if (due.length === 0) {
    return;
  }
  const payload = { rescueId, categories: due };
  try {
    analyticsInvalidatePayload.parse(payload);
  } catch (err) {
    logger.warn('analytics:invalidate payload validation failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  liveIo.to(room(rescueId)).emit('analytics:invalidate', payload);
};

export const emitAnalyticsMetricUpdate = (
  args: z.infer<typeof analyticsMetricUpdatePayload>
): void => {
  if (!liveIo) {
    return;
  }
  try {
    analyticsMetricUpdatePayload.parse(args);
  } catch (err) {
    logger.warn('analytics:metric-update payload validation failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  liveIo.to(room(args.rescueId)).emit('analytics:metric-update', args);
};

/**
 * Personal notification when a scheduled run finishes (success or
 * failed). Goes to the report owner's user:{id} room.
 */
export const emitScheduledRunComplete = (
  ownerUserId: string,
  args: z.infer<typeof reportsScheduledRunCompletePayload>
): void => {
  if (!liveIo) {
    return;
  }
  try {
    reportsScheduledRunCompletePayload.parse(args);
  } catch (err) {
    logger.warn('reports:scheduled-run-complete payload validation failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  liveIo.to(`user:${ownerUserId}`).emit('reports:scheduled-run-complete', args);
};

/** For tests — clear debounce state. */
export const resetAnalyticsEmitterForTests = (): void => {
  debounceMap.clear();
  liveIo = null;
};
