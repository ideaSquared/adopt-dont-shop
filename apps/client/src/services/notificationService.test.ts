/**
 * Behavioural tests for the notification service singleton.
 *
 * The only caller updates notification preferences, so we assert the request
 * it sends and that failures reach the caller.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiPut = vi.fn();

vi.mock('@/services', () => ({
  api: {
    put: (...args: unknown[]) => apiPut(...args),
  },
}));

// Imported after the mock is registered.
import notificationService from './notificationService';

beforeEach(() => {
  vi.resetAllMocks();
  // Silence expected console.error noise from error-path tests.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('preferences', () => {
  it('updates preferences via PUT', async () => {
    apiPut.mockResolvedValue(undefined);

    await notificationService.updatePreferences({ email: false });

    expect(apiPut).toHaveBeenCalledWith('/api/v1/notifications/preferences', { email: false });
  });

  it('propagates the error when the update fails', async () => {
    apiPut.mockRejectedValue(new Error('boom'));

    await expect(notificationService.updatePreferences({ reminders: true })).rejects.toThrow(
      'boom'
    );
  });
});
