/**
 * Library Service Exports for app.rescue
 * This file provides access to all the library services for rescue operations
 */

// Import library services
import { PetsService } from '@adopt-dont-shop/lib.pets';
import { RescueService } from '@adopt-dont-shop/lib.rescue';
import { ChatService } from '@adopt-dont-shop/lib.chat';
import { NotificationsService } from '@adopt-dont-shop/lib.notifications';
import { PermissionsService } from '@adopt-dont-shop/lib.permissions';
import { InvitationsService } from '@adopt-dont-shop/lib.invitations';

// Configure the global apiService FIRST
import { apiService as globalApiService } from '@adopt-dont-shop/lib.api';

// Configure with the proper base URL
import { getApiBaseUrl, isDevelopment } from '../utils/env';

const baseUrl = getApiBaseUrl();
globalApiService.updateConfig({
  apiUrl: baseUrl,
  debug: isDevelopment(),
  // Tokens are stored in HttpOnly cookies — no localStorage fallback needed
});

// Centralized service configuration
const serviceConfig = {
  apiUrl: baseUrl,
  debug: isDevelopment(),
};

// Create configured service instances
export const petService = new PetsService(globalApiService);
export const rescueService = new RescueService(globalApiService, serviceConfig);

// ✅ Configure chatService with the Socket.IO URL. ADS-919: no Authorization
// header is built here anymore — auth rides along automatically on both the
// WS handshake and chatService's REST calls via the HttpOnly accessToken
// cookie (credentials: 'include'), so there's no JS-readable token to read.
// Socket.IO can't use a relative/empty URL — it would default to the Vite dev
// server origin. VITE_WS_BASE_URL points directly at the backend.
const wsBaseUrl = (import.meta.env.VITE_WS_BASE_URL as string | undefined) || baseUrl || undefined;
export const chatService = new ChatService({
  ...serviceConfig,
  socketUrl: wsBaseUrl,
  // Share the global apiService's CSRF token cache so chatService's
  // mutating requests pass the backend CSRF middleware.
  csrfToken: () => globalApiService.getCsrfToken(),
});

export const notificationsService = new NotificationsService(serviceConfig);
export const permissionsService = new PermissionsService(serviceConfig, globalApiService);
export const invitationService = new InvitationsService(globalApiService, serviceConfig);

// Export the configured API service for direct use
export const apiService = globalApiService;
