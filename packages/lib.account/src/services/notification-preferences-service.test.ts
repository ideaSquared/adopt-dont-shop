import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: { get: vi.fn(), put: vi.fn() },
}));

import { apiService } from '@adopt-dont-shop/lib.api';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from './notification-preferences-service';

const SAVED: NotificationPreferences = {
  emailEnabled: true,
  pushEnabled: false,
  smsEnabled: false,
  applicationUpdates: true,
  petMatches: false,
  rescueUpdates: true,
  chatMessages: true,
  digestFrequency: 'daily',
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  timezone: 'Europe/London',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchNotificationPreferences', () => {
  it('reads the gateway response shape (proto field names, enum digest frequency)', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      success: true,
      data: {
        userId: 'u1',
        emailEnabled: true,
        applicationUpdates: true,
        rescueUpdates: true,
        chatMessages: true,
        digestFrequency: 'NOTIFICATION_DIGEST_FREQUENCY_DAILY',
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        timezone: 'Europe/London',
      },
    });

    await expect(fetchNotificationPreferences()).resolves.toEqual(SAVED);
    expect(apiService.get).toHaveBeenCalledWith('/api/v1/notifications/preferences');
  });

  it('treats booleans missing from the response as off — proto JSON omits false values', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      success: true,
      data: { digestFrequency: 'NOTIFICATION_DIGEST_FREQUENCY_WEEKLY', timezone: 'UTC' },
    });

    const prefs = await fetchNotificationPreferences();

    expect(prefs).toMatchObject({
      emailEnabled: false,
      pushEnabled: false,
      smsEnabled: false,
      applicationUpdates: false,
      petMatches: false,
      rescueUpdates: false,
      chatMessages: false,
      digestFrequency: 'weekly',
      timezone: 'UTC',
    });
  });

  it('trims stored quiet hours to HH:MM — Postgres returns time columns with seconds', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      success: true,
      data: { quietHoursStart: '22:00:00', quietHoursEnd: '07:30:00' },
    });

    const prefs = await fetchNotificationPreferences();

    expect(prefs.quietHoursStart).toBe('22:00');
    expect(prefs.quietHoursEnd).toBe('07:30');
  });

  it('leaves quiet hours empty when none are set', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ success: true, data: { timezone: 'UTC' } });

    const prefs = await fetchNotificationPreferences();

    expect(prefs.quietHoursStart).toBe('');
    expect(prefs.quietHoursEnd).toBe('');
  });

  it('falls back to UK time when no timezone is stored', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ success: true, data: {} });

    await expect(fetchNotificationPreferences()).resolves.toMatchObject({
      timezone: 'Europe/London',
    });
  });

  it('rejects a response that is not the preferences envelope', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ unexpected: true });

    await expect(fetchNotificationPreferences()).rejects.toThrow();
  });
});

describe('updateNotificationPreferences', () => {
  it('sends the preferences with field names the gateway understands and returns the saved row', async () => {
    vi.mocked(apiService.put).mockResolvedValue({
      success: true,
      data: { ...SAVED, digestFrequency: 'NOTIFICATION_DIGEST_FREQUENCY_DAILY' },
    });

    await expect(updateNotificationPreferences(SAVED)).resolves.toEqual(SAVED);
    expect(apiService.put).toHaveBeenCalledWith('/api/v1/notifications/preferences', SAVED);
  });

  it('sends empty quiet hours so the backend clears them', async () => {
    vi.mocked(apiService.put).mockResolvedValue({ success: true, data: {} });

    await updateNotificationPreferences({ ...SAVED, quietHoursStart: '', quietHoursEnd: '' });

    expect(apiService.put).toHaveBeenCalledWith(
      '/api/v1/notifications/preferences',
      expect.objectContaining({ quietHoursStart: '', quietHoursEnd: '' })
    );
  });
});
