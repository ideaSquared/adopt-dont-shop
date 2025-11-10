/**
 * API Endpoints for Discovery Service
 * Centralized endpoint definitions following industry standard patterns
 */

export const DISCOVERY_ENDPOINTS = {
  // Pet discovery queue
  DISCOVERY_PETS: '/api/v1/discovery/pets',
  LOAD_MORE_PETS: '/api/v1/discovery/pets/more',

  // Swipe actions
  SWIPE_ACTION: '/api/v1/discovery/swipe/action',

  // Session management
  START_SESSION: '/api/v1/discovery/session/start',
  END_SESSION: '/api/v1/discovery/session/end',
  SESSION_STATS: (sessionId: string) => `/api/v1/discovery/session/${sessionId}/stats`,

  // User preferences and filters
  UPDATE_PREFERENCES: '/api/v1/discovery/preferences',
  GET_PREFERENCES: '/api/v1/discovery/preferences',

  // Analytics and insights
  SWIPE_ANALYTICS: '/api/v1/discovery/analytics/swipes',
  MATCH_INSIGHTS: '/api/v1/discovery/analytics/matches',
} as const;

// Export individual endpoint groups for easier imports
export const {
  DISCOVERY_PETS,
  LOAD_MORE_PETS,
  SWIPE_ACTION,
  START_SESSION,
  END_SESSION,
  SESSION_STATS,
  UPDATE_PREFERENCES,
  GET_PREFERENCES,
  SWIPE_ANALYTICS,
  MATCH_INSIGHTS,
} = DISCOVERY_ENDPOINTS;
