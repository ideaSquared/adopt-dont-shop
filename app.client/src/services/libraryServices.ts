/**
 * Library Service Exports
 * This file provides access to all the new library services
 * Part of Phase 2 - Core Infrastructure Migration
 */

// Import library services
import { AnalyticsService } from '@adopt-dont-shop/lib-analytics';
import { ApplicationsService } from '@adopt-dont-shop/lib-applications';
import { DiscoveryService } from '@adopt-dont-shop/lib-discovery';
import { PetsService } from '@adopt-dont-shop/lib-pets';
import { ApiService } from '@adopt-dont-shop/lib-api';
import { RescueService } from '@adopt-dont-shop/lib-rescue';
import { AuthService } from '@adopt-dont-shop/lib-auth';
import { ChatService } from '@adopt-dont-shop/lib-chat';
import { SearchService } from '@adopt-dont-shop/lib-search';
import { NotificationsService } from '@adopt-dont-shop/lib-notifications';
import { FeatureFlagsService } from '@adopt-dont-shop/lib-feature-flags';
import { PermissionsService } from '@adopt-dont-shop/lib-permissions';

// Create shared API service instance
const apiService = new ApiService();

// Create configured service instances
export const analyticsService = new AnalyticsService({
  apiUrl: '/api/v1/analytics',
  debug: process.env.NODE_ENV === 'development',
});

export const applicationService = new ApplicationsService(apiService, {
  apiUrl: process.env.VITE_API_URL || 'http://localhost:5000',
  debug: process.env.NODE_ENV === 'development',
});

export const discoveryService = new DiscoveryService({
  apiUrl: '/api/v1/discovery',
});

export const petService = new PetsService(apiService);

export const rescueService = new RescueService(apiService, {
  apiUrl: process.env.VITE_API_URL || 'http://localhost:5000',
});

export const authService = new AuthService();

export const chatService = new ChatService({
  apiUrl: process.env.VITE_API_URL || 'http://localhost:5000',
});

export const searchService = new SearchService({
  apiUrl: process.env.VITE_API_URL || 'http://localhost:5000',
  debug: process.env.NODE_ENV === 'development',
});

export const notificationsService = new NotificationsService({
  apiUrl: process.env.VITE_API_URL || 'http://localhost:5000',
  debug: process.env.NODE_ENV === 'development',
});

export const featureFlagsService = new FeatureFlagsService({
  apiUrl: process.env.VITE_API_URL || 'http://localhost:5000',
  debug: process.env.NODE_ENV === 'development',
});

export const permissionsService = new PermissionsService({
  debug: process.env.NODE_ENV === 'development',
});

// Re-export types for convenience
export type { UserEngagementEvent, PageViewEvent } from '@adopt-dont-shop/lib-analytics';

export type {
  Application,
  ApplicationData,
  ApplicationStatus,
} from '@adopt-dont-shop/lib-applications';

export type {
  DiscoveryPet,
  SwipeAction,
  SwipeStats,
  SwipeSession,
} from '@adopt-dont-shop/lib-discovery';

export type { Pet, PetSearchFilters, PaginatedResponse } from '@adopt-dont-shop/lib-pets';

export type {
  Rescue,
  RescueSearchFilters,
  RescueStatus,
  RescueType,
  RescueLocation,
} from '@adopt-dont-shop/lib-rescue';

export type { User, AuthResponse, LoginRequest, RegisterRequest } from '@adopt-dont-shop/lib-auth';

export type {
  ChatServiceConfig,
  Conversation,
  Message,
  TypingIndicator,
} from '@adopt-dont-shop/lib-chat';

export type { SearchServiceConfig, SearchServiceOptions } from '@adopt-dont-shop/lib-search';

export type { Notification, NotificationPreferences } from '@adopt-dont-shop/lib-notifications';

export type { FeatureFlag, DynamicConfig } from '@adopt-dont-shop/lib-feature-flags';

export type { Permission, UserWithPermissions } from '@adopt-dont-shop/lib-permissions';
