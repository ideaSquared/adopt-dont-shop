/**
 * API Endpoints for Search Service
 * Centralized endpoint definitions following industry standard patterns
 */

export const SEARCH_ENDPOINTS = {
  // Core search operations
  SEARCH: '/api/v1/search',
  SEARCH_PETS: '/api/v1/search/pets',
  SEARCH_RESCUES: '/api/v1/search/rescues',
  SEARCH_MESSAGES: '/api/v1/search/messages',

  // Advanced search features
  FACETED_SEARCH: '/api/v1/search/faceted',
  SEARCH_SUGGESTIONS: '/api/v1/search/suggestions',
  SEARCH_AUTOCOMPLETE: '/api/v1/search/autocomplete',

  // Search analytics and insights
  SEARCH_METRICS: '/api/v1/search/metrics',
  POPULAR_SEARCHES: '/api/v1/search/popular',
  SEARCH_TRENDS: '/api/v1/search/trends',

  // Saved searches and preferences
  SAVED_SEARCHES: '/api/v1/search/saved',
  SAVE_SEARCH: '/api/v1/search/save',
  DELETE_SAVED_SEARCH: (id: string) => `/api/v1/search/saved/${id}`,

  // Search filters and options
  SEARCH_FILTERS: '/api/v1/search/filters',
  FILTER_OPTIONS: (category: string) => `/api/v1/search/filters/${category}`,
} as const;

// Export individual endpoint groups for easier imports
export const {
  SEARCH,
  SEARCH_PETS,
  SEARCH_RESCUES,
  SEARCH_MESSAGES,
  FACETED_SEARCH,
  SEARCH_SUGGESTIONS,
  SEARCH_AUTOCOMPLETE,
  SEARCH_METRICS,
  POPULAR_SEARCHES,
  SEARCH_TRENDS,
  SAVED_SEARCHES,
  SAVE_SEARCH,
  DELETE_SAVED_SEARCH,
  SEARCH_FILTERS,
  FILTER_OPTIONS,
} = SEARCH_ENDPOINTS;
