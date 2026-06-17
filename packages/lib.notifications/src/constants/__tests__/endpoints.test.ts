import {
  NOTIFICATIONS_ENDPOINTS,
  NOTIFICATIONS,
  NOTIFICATION_BY_ID,
  MARK_AS_READ,
  MARK_ALL_AS_READ,
  DELETE_NOTIFICATION,
  CLEAR_ALL_NOTIFICATIONS,
  PREFERENCES,
  UPDATE_PREFERENCES,
  REGISTER_DEVICE,
  UNREGISTER_DEVICE,
  UPDATE_DEVICE_SETTINGS,
  EMAIL_PREFERENCES,
  UPDATE_EMAIL_PREFERENCES,
  UNSUBSCRIBE_EMAIL,
  NOTIFICATION_TYPES,
  NOTIFICATION_TEMPLATES,
  NOTIFICATION_STATS,
  ENGAGEMENT_METRICS,
} from '../endpoints';

describe('NOTIFICATIONS_ENDPOINTS', () => {
  describe('static endpoints', () => {
    it('should expose the core collection and management paths', () => {
      expect(NOTIFICATIONS).toBe('/api/v1/notifications');
      expect(MARK_ALL_AS_READ).toBe('/api/v1/notifications/read-all');
      expect(CLEAR_ALL_NOTIFICATIONS).toBe('/api/v1/notifications/clear-all');
    });

    it('should expose preference and email paths', () => {
      expect(PREFERENCES).toBe('/api/v1/notifications/preferences');
      expect(UPDATE_PREFERENCES).toBe('/api/v1/notifications/preferences');
      expect(EMAIL_PREFERENCES).toBe('/api/v1/notifications/email');
      expect(UPDATE_EMAIL_PREFERENCES).toBe('/api/v1/notifications/email');
      expect(UNSUBSCRIBE_EMAIL).toBe('/api/v1/notifications/email/unsubscribe');
    });

    it('should expose device registration and analytics paths', () => {
      expect(REGISTER_DEVICE).toBe('/api/v1/notifications/devices');
      expect(NOTIFICATION_TYPES).toBe('/api/v1/notifications/types');
      expect(NOTIFICATION_TEMPLATES).toBe('/api/v1/notifications/templates');
      expect(NOTIFICATION_STATS).toBe('/api/v1/notifications/stats');
      expect(ENGAGEMENT_METRICS).toBe('/api/v1/notifications/metrics/engagement');
    });
  });

  describe('parameterised endpoint builders', () => {
    it('should build per-notification paths from an id', () => {
      expect(NOTIFICATION_BY_ID('abc')).toBe('/api/v1/notifications/abc');
      expect(MARK_AS_READ('abc')).toBe('/api/v1/notifications/abc/read');
      expect(DELETE_NOTIFICATION('abc')).toBe('/api/v1/notifications/abc');
    });

    it('should build per-device paths from a deviceId', () => {
      expect(UNREGISTER_DEVICE('dev1')).toBe('/api/v1/notifications/devices/dev1');
      expect(UPDATE_DEVICE_SETTINGS('dev1')).toBe('/api/v1/notifications/devices/dev1');
    });
  });

  it('should expose the same values via the namespaced object', () => {
    expect(NOTIFICATIONS_ENDPOINTS.NOTIFICATIONS).toBe(NOTIFICATIONS);
    expect(NOTIFICATIONS_ENDPOINTS.NOTIFICATION_BY_ID('xyz')).toBe(NOTIFICATION_BY_ID('xyz'));
  });
});
