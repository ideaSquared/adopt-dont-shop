/**
 * Library Service Exports for app.rescue
 * This file provides access to all the library services for rescue operations
 */

// Import library services
import { AnalyticsService } from '@adopt-dont-shop/lib-analytics';
import { ApplicationsService } from '@adopt-dont-shop/lib-applications';
import { PetsService } from '@adopt-dont-shop/lib-pets';
import { RescueService } from '@adopt-dont-shop/lib-rescue';
import { ChatService } from '@adopt-dont-shop/lib-chat';
import { NotificationsService } from '@adopt-dont-shop/lib-notifications';
import { PermissionsService } from '@adopt-dont-shop/lib-permissions';
import { ValidationService } from '@adopt-dont-shop/lib-validation';

// Configure the global apiService FIRST
import { apiService as globalApiService } from '@adopt-dont-shop/lib-api';
import { AuthenticationError } from '@adopt-dont-shop/lib-api';

// Configure with the proper base URL
import { getApiBaseUrl, isDevelopment } from '../utils/env';

const baseUrl = getApiBaseUrl();
globalApiService.updateConfig({
  apiUrl: baseUrl,
  debug: isDevelopment(),
  getAuthToken: () => {
    return localStorage.getItem('accessToken') || localStorage.getItem('authToken');
  }
});

// Add 401 error interceptor for automatic logout and redirect
globalApiService.interceptors.addErrorInterceptor(async (error) => {
  // Handle 401 authentication errors
  if (error instanceof AuthenticationError || 
      (error instanceof Error && error.message.includes('401'))) {
    // Clear authentication tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Redirect to homepage
    window.location.href = '/';
  }
  return error;
});

// Now import AuthService AFTER configuring the global apiService
import { AuthService } from '@adopt-dont-shop/lib-auth';

// Centralized service configuration
const serviceConfig = {
  apiUrl: baseUrl,
  debug: isDevelopment(),
};

// Create configured service instances
export const analyticsService = new AnalyticsService(serviceConfig);
export const applicationService = new ApplicationsService(globalApiService, serviceConfig);
export const petService = new PetsService(globalApiService);
export const rescueService = new RescueService(globalApiService, serviceConfig);
export const chatService = new ChatService(serviceConfig);
export const notificationsService = new NotificationsService(serviceConfig);
export const permissionsService = new PermissionsService(serviceConfig, globalApiService);
export const validationService = new ValidationService(serviceConfig);

// AuthService uses the pre-configured global apiService
export const authService = new AuthService();

// Export the configured API service for direct use
export const apiService = globalApiService;
