/**
 * API Endpoints for Analytics Service
 * Centralized endpoint definitions following industry standard patterns
 */

export const ANALYTICS_ENDPOINTS = {
  // Core analytics operations
  EVENTS: '/api/v1/analytics/events',
  PAGE_VIEWS: '/api/v1/analytics/page-views',
  USER_ENGAGEMENT: '/api/v1/analytics/engagement',

  // Event tracking
  TRACK_EVENT: '/api/v1/analytics/track',
  BATCH_EVENTS: '/api/v1/analytics/batch',

  // User behavior analytics
  USER_JOURNEY: '/api/v1/analytics/user-journey',
  SESSION_ANALYTICS: '/api/v1/analytics/sessions',
  CONVERSION_FUNNEL: '/api/v1/analytics/conversions',

  // Pet and adoption analytics
  PET_VIEW_ANALYTICS: '/api/v1/analytics/pets/views',
  ADOPTION_METRICS: '/api/v1/analytics/adoptions',
  SEARCH_ANALYTICS: '/api/v1/analytics/search',
  DISCOVERY_METRICS: '/api/v1/analytics/discovery',

  // Performance and technical metrics
  PERFORMANCE_METRICS: '/api/v1/analytics/performance',
  ERROR_TRACKING: '/api/v1/analytics/errors',
  API_USAGE_STATS: '/api/v1/analytics/api-usage',

  // Real-time analytics
  REAL_TIME_USERS: '/api/v1/analytics/real-time/users',
  REAL_TIME_EVENTS: '/api/v1/analytics/real-time/events',

  // Dashboard and reporting
  DASHBOARD_METRICS: '/api/v1/analytics/dashboard',
  CUSTOM_REPORTS: '/api/v1/analytics/reports',
  EXPORT_DATA: '/api/v1/analytics/export',

  // A/B testing and experiments
  EXPERIMENTS: '/api/v1/analytics/experiments',
  EXPERIMENT_RESULTS: (id: string) => `/api/v1/analytics/experiments/${id}/results`,
} as const;

// Export individual endpoint groups for easier imports
export const {
  EVENTS,
  PAGE_VIEWS,
  USER_ENGAGEMENT,
  TRACK_EVENT,
  BATCH_EVENTS,
  USER_JOURNEY,
  SESSION_ANALYTICS,
  CONVERSION_FUNNEL,
  PET_VIEW_ANALYTICS,
  ADOPTION_METRICS,
  SEARCH_ANALYTICS,
  DISCOVERY_METRICS,
  PERFORMANCE_METRICS,
  ERROR_TRACKING,
  API_USAGE_STATS,
  REAL_TIME_USERS,
  REAL_TIME_EVENTS,
  DASHBOARD_METRICS,
  CUSTOM_REPORTS,
  EXPORT_DATA,
  EXPERIMENTS,
  EXPERIMENT_RESULTS,
} = ANALYTICS_ENDPOINTS;
