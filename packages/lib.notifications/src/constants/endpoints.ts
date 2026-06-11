/**
 * API Endpoints for Notifications Service
 * Centralized endpoint definitions following industry standard patterns
 */

export const NOTIFICATIONS_ENDPOINTS = {
  // Core notification operations
  NOTIFICATIONS: '/api/v1/notifications',
  NOTIFICATION_BY_ID: (id: string) => `/api/v1/notifications/${id}`,

  // Notification management
  MARK_AS_READ: (id: string) => `/api/v1/notifications/${id}/read`,
  MARK_ALL_AS_READ: '/api/v1/notifications/read-all',
  DELETE_NOTIFICATION: (id: string) => `/api/v1/notifications/${id}`,
  CLEAR_ALL_NOTIFICATIONS: '/api/v1/notifications/clear-all',

  // Notification preferences
  PREFERENCES: '/api/v1/notifications/preferences',
  UPDATE_PREFERENCES: '/api/v1/notifications/preferences',

  // Push notification settings
  REGISTER_DEVICE: '/api/v1/notifications/devices',
  UNREGISTER_DEVICE: (deviceId: string) => `/api/v1/notifications/devices/${deviceId}`,
  UPDATE_DEVICE_SETTINGS: (deviceId: string) => `/api/v1/notifications/devices/${deviceId}`,

  // Email notification settings
  EMAIL_PREFERENCES: '/api/v1/notifications/email',
  UPDATE_EMAIL_PREFERENCES: '/api/v1/notifications/email',
  UNSUBSCRIBE_EMAIL: '/api/v1/notifications/email/unsubscribe',

  // Notification templates and types
  NOTIFICATION_TYPES: '/api/v1/notifications/types',
  NOTIFICATION_TEMPLATES: '/api/v1/notifications/templates',

  // Notification analytics
  NOTIFICATION_STATS: '/api/v1/notifications/stats',
  ENGAGEMENT_METRICS: '/api/v1/notifications/metrics/engagement',
} as const;

// Export individual endpoint groups for easier imports
export const {
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
} = NOTIFICATIONS_ENDPOINTS;
