/**
 * API Endpoints for Rescue Service
 * Centralized endpoint definitions following industry standard patterns
 */

export const RESCUE_ENDPOINTS = {
  // Core rescue operations
  RESCUES: '/api/v1/rescues',
  RESCUE_BY_ID: (id: string) => `/api/v1/rescues/${id}`,

  // Rescue search and filtering
  SEARCH_RESCUES: '/api/v1/rescues/search',
  FEATURED_RESCUES: '/api/v1/rescues/featured',
  NEARBY_RESCUES: '/api/v1/rescues/nearby',

  // Rescue registration and verification
  REGISTER_RESCUE: '/api/v1/rescues/register',
  VERIFY_RESCUE: (id: string) => `/api/v1/rescues/${id}/verify`,

  // Rescue profile management
  UPDATE_PROFILE: (id: string) => `/api/v1/rescues/${id}/profile`,
  UPLOAD_LOGO: (id: string) => `/api/v1/rescues/${id}/logo`,
  UPLOAD_IMAGES: (id: string) => `/api/v1/rescues/${id}/images`,

  // Rescue statistics and analytics
  RESCUE_STATS: (id: string) => `/api/v1/rescues/${id}/stats`,
  ADOPTION_METRICS: (id: string) => `/api/v1/rescues/${id}/metrics`,

  // Adoption policies
  ADOPTION_POLICIES: (id: string) => `/api/v1/rescues/${id}/adoption-policies`,
  UPDATE_ADOPTION_POLICIES: (id: string) => `/api/v1/rescues/${id}/adoption-policies`,

  // Reviews and ratings
  RESCUE_REVIEWS: (id: string) => `/api/v1/rescues/${id}/reviews`,
  ADD_REVIEW: (id: string) => `/api/v1/rescues/${id}/reviews`,

  // Following/bookmarking rescues
  FOLLOW_RESCUE: (id: string) => `/api/v1/rescues/${id}/follow`,
  UNFOLLOW_RESCUE: (id: string) => `/api/v1/rescues/${id}/follow`,
  USER_FOLLOWED_RESCUES: '/api/v1/rescues/followed',
} as const;

// Export individual endpoint groups for easier imports
export const {
  RESCUES,
  RESCUE_BY_ID,
  SEARCH_RESCUES,
  FEATURED_RESCUES,
  NEARBY_RESCUES,
  REGISTER_RESCUE,
  VERIFY_RESCUE,
  UPDATE_PROFILE,
  UPLOAD_LOGO,
  UPLOAD_IMAGES,
  RESCUE_STATS,
  ADOPTION_METRICS,
  ADOPTION_POLICIES,
  UPDATE_ADOPTION_POLICIES,
  RESCUE_REVIEWS,
  ADD_REVIEW,
  FOLLOW_RESCUE,
  UNFOLLOW_RESCUE,
  USER_FOLLOWED_RESCUES,
} = RESCUE_ENDPOINTS;
