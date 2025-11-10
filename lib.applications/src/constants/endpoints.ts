/**
 * API Endpoints for Applications Service
 * Centralized endpoint definitions following industry standard patterns
 */

export const APPLICATIONS_ENDPOINTS = {
  // Core application operations
  APPLICATIONS: '/api/v1/applications',
  APPLICATION_BY_ID: (id: string) => `/api/v1/applications/${id}`,

  // Submit and manage applications
  SUBMIT_APPLICATION: '/api/v1/applications/submit',
  UPDATE_APPLICATION: (id: string) => `/api/v1/applications/${id}`,
  WITHDRAW_APPLICATION: (id: string) => `/api/v1/applications/${id}/withdraw`,

  // Application status management
  UPDATE_STATUS: (id: string) => `/api/v1/applications/${id}/status`,
  APPLICATION_HISTORY: (id: string) => `/api/v1/applications/${id}/history`,

  // Pet-specific applications
  PET_APPLICATIONS: (petId: string) => `/api/v1/applications/pet/${petId}`,
  USER_APPLICATIONS: '/api/v1/applications/user',
  RESCUE_APPLICATIONS: (rescueId: string) => `/api/v1/applications/rescue/${rescueId}`,

  // Application documents and attachments
  UPLOAD_DOCUMENTS: (id: string) => `/api/v1/applications/${id}/documents`,
  DOWNLOAD_DOCUMENT: (id: string, documentId: string) =>
    `/api/v1/applications/${id}/documents/${documentId}`,

  // Application reviews and notes
  ADD_REVIEW_NOTE: (id: string) => `/api/v1/applications/${id}/notes`,
  GET_REVIEW_NOTES: (id: string) => `/api/v1/applications/${id}/notes`,

  // Application analytics
  APPLICATION_STATS: '/api/v1/applications/stats',
  ADOPTION_SUCCESS_METRICS: '/api/v1/applications/metrics/success',
} as const;

// Export individual endpoint groups for easier imports
export const {
  APPLICATIONS,
  APPLICATION_BY_ID,
  SUBMIT_APPLICATION,
  UPDATE_APPLICATION,
  WITHDRAW_APPLICATION,
  UPDATE_STATUS,
  APPLICATION_HISTORY,
  PET_APPLICATIONS,
  USER_APPLICATIONS,
  RESCUE_APPLICATIONS,
  UPLOAD_DOCUMENTS,
  DOWNLOAD_DOCUMENT,
  ADD_REVIEW_NOTE,
  GET_REVIEW_NOTES,
  APPLICATION_STATS,
  ADOPTION_SUCCESS_METRICS,
} = APPLICATIONS_ENDPOINTS;
