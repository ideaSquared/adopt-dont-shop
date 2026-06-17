/**
 * Behavioural tests for the notification service singleton.
 *
 * Treats the service as a black box: callers fetch notifications, read the
 * unread count, mutate read state, manage preferences, and subscribe to
 * count/notification changes. We assert the user-observable outcomes (returned
 * values, propagated errors, subscriber callbacks) rather than internals.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPut = vi.fn();
const apiPatch = vi.fn();
const apiDelete = vi.fn();

vi.mock('@/services', () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
    put: (...args: unknown[]) => apiPut(...args),
    patch: (...args: unknown[]) => apiPatch(...args),
    delete: (...args: unknown[]) => apiDelete(...args),
  },
}));

// Imported after the mock is registered.
import notificationService from './notificationService';

beforeEach(() => {
  vi.resetAllMocks();
  notificationService.clearState();
  // Silence expected console.error noise from error-path tests.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const sampleNotification = {
  notification_id: 'n-1',
  title: 'Application update',
  message: 'Your application was approved',
  type: 'application',
  priority: 'high' as const,
  created_at: '2026-06-01T00:00:00.000Z',
};

describe('getNotifications', () => {
  it('returns notifications and pagination from the `data` response shape', async () => {
    apiGet.mockResolvedValue({
      data: [sampleNotification],
      pagination: { page: 2, limit: 5, total: 11, pages: 3 },
    });

    const result = await notificationService.getNotifications({ page: 2, limit: 5 });

    expect(apiGet).toHaveBeenCalledWith('/api/v1/notifications', { page: 2, limit: 5 });
    expect(result.notifications).toEqual([sampleNotification]);
    expect(result.pagination).toEqual({ page: 2, limit: 5, total: 11, pages: 3 });
  });

  it('falls back to the `notifications` response shape', async () => {
    apiGet.mockResolvedValue({ notifications: [sampleNotification] });

    const result = await notificationService.getNotifications();

    expect(result.notifications).toEqual([sampleNotification]);
  });

  it('synthesises pagination when the response omits it', async () => {
    apiGet.mockResolvedValue({ data: [sampleNotification] });

    const result = await notificationService.getNotifications({ limit: 20 });

    expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, pages: 1 });
  });

  it('propagates the error when the request fails', async () => {
    apiGet.mockRejectedValue(new Error('network down'));

    await expect(notificationService.getNotifications()).rejects.toThrow('network down');
  });
});

describe('getUnreadCount', () => {
  it('reads the deeply nested success/data/count shape', async () => {
    apiGet.mockResolvedValue({ data: { success: true, data: { count: 7 } } });

    await expect(notificationService.getUnreadCount()).resolves.toBe(7);
  });

  it('reads the data.count shape', async () => {
    apiGet.mockResolvedValue({ data: { count: 4 } });

    await expect(notificationService.getUnreadCount()).resolves.toBe(4);
  });

  it('reads the top-level count shape', async () => {
    apiGet.mockResolvedValue({ count: 9 });

    await expect(notificationService.getUnreadCount()).resolves.toBe(9);
  });

  it('returns 0 and does not throw when the request fails', async () => {
    apiGet.mockRejectedValue(new Error('boom'));

    await expect(notificationService.getUnreadCount()).resolves.toBe(0);
  });

  it('notifies unread-count subscribers with the resolved count', async () => {
    apiGet.mockResolvedValue({ count: 3 });
    const listener = vi.fn();
    notificationService.onUnreadCountChange(listener);

    await notificationService.getUnreadCount();

    expect(listener).toHaveBeenCalledWith(3);
  });
});

describe('mutations refresh unread count', () => {
  it('markAsRead patches the notification then refetches the count', async () => {
    apiPatch.mockResolvedValue(undefined);
    apiGet.mockResolvedValue({ count: 2 });

    await notificationService.markAsRead('n-1');

    expect(apiPatch).toHaveBeenCalledWith('/api/v1/notifications/n-1/read');
    expect(apiGet).toHaveBeenCalledWith('/api/v1/notifications/unread/count');
  });

  it('markAsRead propagates the error when the patch fails', async () => {
    apiPatch.mockRejectedValue(new Error('nope'));

    await expect(notificationService.markAsRead('n-1')).rejects.toThrow('nope');
  });

  it('markAllAsRead resets subscribers to zero', async () => {
    apiPost.mockResolvedValue(undefined);
    const listener = vi.fn();
    notificationService.onUnreadCountChange(listener);

    await notificationService.markAllAsRead();

    expect(apiPost).toHaveBeenCalledWith('/api/v1/notifications/read-all');
    expect(listener).toHaveBeenCalledWith(0);
  });

  it('deleteNotification deletes the notification', async () => {
    apiDelete.mockResolvedValue(undefined);
    apiGet.mockResolvedValue({ count: 0 });

    await notificationService.deleteNotification('n-1');

    expect(apiDelete).toHaveBeenCalledWith('/api/v1/notifications/n-1');
  });
});

describe('preferences', () => {
  it('returns the nested success/data preferences when present', async () => {
    const prefs = {
      email: false,
      push: true,
      sms: false,
      applications: true,
      messages: false,
      system: true,
      marketing: false,
      reminders: true,
    };
    apiGet.mockResolvedValue({ data: { success: true, data: prefs } });

    await expect(notificationService.getPreferences()).resolves.toEqual(prefs);
  });

  it('returns sensible defaults when the request fails', async () => {
    apiGet.mockRejectedValue(new Error('down'));

    await expect(notificationService.getPreferences()).rejects.toThrow('down');
  });

  it('updates preferences via PUT', async () => {
    apiPut.mockResolvedValue(undefined);

    await notificationService.updatePreferences({ email: false });

    expect(apiPut).toHaveBeenCalledWith('/api/v1/notifications/preferences', { email: false });
  });
});

describe('subscriptions', () => {
  it('stops notifying after the unread-count subscriber unsubscribes', async () => {
    apiGet.mockResolvedValue({ count: 5 });
    const listener = vi.fn();
    const unsubscribe = notificationService.onUnreadCountChange(listener);

    unsubscribe();
    await notificationService.getUnreadCount();

    expect(listener).not.toHaveBeenCalled();
  });

  it('delivers a simulated notification to new-notification subscribers', () => {
    apiGet.mockResolvedValue({ count: 0 });
    const listener = vi.fn();
    notificationService.onNewNotification(listener);

    notificationService.simulateNewNotification(sampleNotification);

    expect(listener).toHaveBeenCalledWith(sampleNotification);
  });

  it('stops delivering after the new-notification subscriber unsubscribes', () => {
    apiGet.mockResolvedValue({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = notificationService.onNewNotification(listener);

    unsubscribe();
    notificationService.simulateNewNotification(sampleNotification);

    expect(listener).not.toHaveBeenCalled();
  });

  it('clearState resets the count to zero and detaches all subscribers', () => {
    const listener = vi.fn();
    notificationService.onUnreadCountChange(listener);

    notificationService.clearState();

    expect(listener).toHaveBeenCalledWith(0);

    // After clearing, a subsequent simulate must not reach the old listener.
    listener.mockClear();
    notificationService.simulateNewNotification(sampleNotification);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('device tokens', () => {
  it('registers a device token', async () => {
    apiPost.mockResolvedValue(undefined);

    await notificationService.registerDeviceToken('tok-1');

    expect(apiPost).toHaveBeenCalledWith('/api/v1/device-tokens', { token: 'tok-1' });
  });

  it('unregisters a device token', async () => {
    apiDelete.mockResolvedValue(undefined);

    await notificationService.unregisterDeviceToken('tok-1');

    expect(apiDelete).toHaveBeenCalledWith('/api/v1/device-tokens/tok-1');
  });

  it('propagates a registration failure', async () => {
    apiPost.mockRejectedValue(new Error('rejected'));

    await expect(notificationService.registerDeviceToken('tok-1')).rejects.toThrow('rejected');
  });
});
