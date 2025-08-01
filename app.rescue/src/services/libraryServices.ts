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

// Configure with the proper base URL
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
globalApiService.updateConfig({
  apiUrl: baseUrl,
  debug: import.meta.env.DEV,
});

// Now import AuthService AFTER configuring the global apiService
import { AuthService } from '@adopt-dont-shop/lib-auth';

// Centralized service configuration
const serviceConfig = {
  apiUrl: baseUrl,
  debug: import.meta.env.DEV,
};

// Create configured service instances
export const analyticsService = new AnalyticsService(serviceConfig);
export const applicationService = new ApplicationsService(globalApiService, serviceConfig);
export const petService = new PetsService(globalApiService);
export const rescueService = new RescueService(globalApiService, serviceConfig);
export const chatService = new ChatService(serviceConfig);
export const notificationsService = new NotificationsService(serviceConfig);
export const permissionsService = new PermissionsService(serviceConfig);
export const validationService = new ValidationService(serviceConfig);

// AuthService uses the pre-configured global apiService
export const authService = new AuthService();
