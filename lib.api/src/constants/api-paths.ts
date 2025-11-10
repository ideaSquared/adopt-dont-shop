/**
 * API Path Constants
 * Centralized API endpoint path management
 * Industry Standard: Library controls all URL construction
 */

// Base API path prefix
export const API_BASE_PATH = '/api/v1';

// Authentication endpoints
export const AUTH_PATHS = {
  LOGIN: `${API_BASE_PATH}/auth/login`,
  REGISTER: `${API_BASE_PATH}/auth/register`,
  LOGOUT: `${API_BASE_PATH}/auth/logout`,
  REFRESH: `${API_BASE_PATH}/auth/refresh`,
  ME: `${API_BASE_PATH}/auth/me`,
  CHANGE_PASSWORD: `${API_BASE_PATH}/auth/change-password`,
  FORGOT_PASSWORD: `${API_BASE_PATH}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE_PATH}/auth/reset-password`,
} as const;

// Admin endpoints
export const ADMIN_PATHS = {
  LOGIN: `${API_BASE_PATH}/auth/admin/login`,
  REGISTER: `${API_BASE_PATH}/auth/admin/register`,
  USERS: `${API_BASE_PATH}/admin/users`,
  DASHBOARD: `${API_BASE_PATH}/admin/dashboard`,
  AUDIT_LOGS: `${API_BASE_PATH}/admin/audit-logs`,
  RESCUES: `${API_BASE_PATH}/admin/rescues`,
} as const;

// Pet management endpoints
export const PET_PATHS = {
  BASE: `${API_BASE_PATH}/pets`,
  BY_ID: (id: string) => `${API_BASE_PATH}/pets/${id}`,
  PHOTOS: (id: string) => `${API_BASE_PATH}/pets/${id}/photos`,
  FAVORITE: (id: string) => `${API_BASE_PATH}/pets/${id}/favorite`,
  SEARCH: `${API_BASE_PATH}/pets/search`,
} as const;

// User management endpoints
export const USER_PATHS = {
  BASE: `${API_BASE_PATH}/users`,
  PROFILE: `${API_BASE_PATH}/users/profile`,
  ACCOUNT: `${API_BASE_PATH}/users/account`,
  PREFERENCES: `${API_BASE_PATH}/users/preferences`,
} as const;

// Rescue endpoints
export const RESCUE_PATHS = {
  BASE: `${API_BASE_PATH}/rescues`,
  BY_ID: (id: string) => `${API_BASE_PATH}/rescues/${id}`,
  VERIFY: (id: string) => `${API_BASE_PATH}/rescues/${id}/verify`,
  STAFF: (id: string) => `${API_BASE_PATH}/rescues/${id}/staff`,
} as const;

// Application endpoints
export const APPLICATION_PATHS = {
  BASE: `${API_BASE_PATH}/applications`,
  BY_ID: (id: string) => `${API_BASE_PATH}/applications/${id}`,
  SUBMIT: `${API_BASE_PATH}/applications/submit`,
  STATUS: (id: string) => `${API_BASE_PATH}/applications/${id}/status`,
} as const;

// Discovery endpoints
export const DISCOVERY_PATHS = {
  SWIPE: `${API_BASE_PATH}/discovery/swipe`,
  MATCHES: `${API_BASE_PATH}/discovery/matches`,
  STATS: `${API_BASE_PATH}/discovery/stats`,
} as const;

// Chat endpoints
export const CHAT_PATHS = {
  CONVERSATIONS: `${API_BASE_PATH}/conversations`,
  MESSAGES: (conversationId: string) => `${API_BASE_PATH}/conversations/${conversationId}/messages`,
} as const;

// Search endpoints
export const SEARCH_PATHS = {
  PETS: `${API_BASE_PATH}/search/pets`,
  RESCUES: `${API_BASE_PATH}/search/rescues`,
} as const;

// Notification endpoints
export const NOTIFICATION_PATHS = {
  BASE: `${API_BASE_PATH}/notifications`,
  MARK_READ: (id: string) => `${API_BASE_PATH}/notifications/${id}/read`,
  PREFERENCES: `${API_BASE_PATH}/notifications/preferences`,
} as const;

// Feature flag endpoints
export const FEATURE_PATHS = {
  BASE: `${API_BASE_PATH}/features`,
  BY_NAME: (name: string) => `${API_BASE_PATH}/features/${name}`,
} as const;

// Health check endpoints
export const HEALTH_PATHS = {
  SIMPLE: `${API_BASE_PATH}/health/simple`,
  DETAILED: `${API_BASE_PATH}/health/detailed`,
} as const;

// File upload endpoints
export const UPLOAD_PATHS = {
  IMAGES: `${API_BASE_PATH}/uploads/images`,
  DOCUMENTS: `${API_BASE_PATH}/uploads/documents`,
} as const;

// Configuration endpoints
export const CONFIG_PATHS = {
  BASE: `${API_BASE_PATH}/config`,
  PUBLIC: `${API_BASE_PATH}/config/public`,
} as const;

// Utility function to build custom paths
export const buildApiPath = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return path.startsWith(API_BASE_PATH) ? path : `${API_BASE_PATH}${cleanPath}`;
};

// Export all paths for easy access
export const API_PATHS = {
  BASE: API_BASE_PATH,
  AUTH: AUTH_PATHS,
  ADMIN: ADMIN_PATHS,
  PETS: PET_PATHS,
  USERS: USER_PATHS,
  RESCUES: RESCUE_PATHS,
  APPLICATIONS: APPLICATION_PATHS,
  DISCOVERY: DISCOVERY_PATHS,
  CHAT: CHAT_PATHS,
  SEARCH: SEARCH_PATHS,
  NOTIFICATIONS: NOTIFICATION_PATHS,
  FEATURES: FEATURE_PATHS,
  HEALTH: HEALTH_PATHS,
  UPLOADS: UPLOAD_PATHS,
  CONFIG: CONFIG_PATHS,
  build: buildApiPath,
} as const;
