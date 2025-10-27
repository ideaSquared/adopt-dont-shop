import { ApiService } from '@adopt-dont-shop/lib-api';
import { AuthenticationError } from '@adopt-dont-shop/lib-api';
import {
  AdminService,
  AuditService,
  ConfigService,
  AnalyticsService,
} from '@adopt-dont-shop/lib-admin';

// Create the global API service instance with auth token function
export const globalApiService = new ApiService({
  apiUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  debug: import.meta.env.DEV,
  // Provide function to get auth token from localStorage
  getAuthToken: () => {
    return localStorage.getItem('authToken') || localStorage.getItem('accessToken');
  }
});

// Add error interceptor for handling 401 responses
globalApiService.interceptors.addErrorInterceptor((error: unknown) => {
  if (error instanceof AuthenticationError || (error as { response?: { status?: number } })?.response?.status === 401) {
    // Clear authentication token
    localStorage.removeItem('authToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');

    // Redirect to login page
    window.location.href = '/login';
  }

  throw error;
});

// Export the configured API service
export const apiService = globalApiService;

// Export additional API service alias for compatibility
export const api = globalApiService;

// ============================================
// Admin Services
// ============================================

// Create configured admin service instances
export const adminService = new AdminService(globalApiService);
export const auditService = new AuditService(globalApiService);
export const configService = new ConfigService(globalApiService);
export const analyticsService = new AnalyticsService(globalApiService);

// Re-export types for convenience
export type {
  // User types
  AdminUser,
  UserListResponse,
  UserFilters,
  UserAction,
  UserStatus,
  UserType,

  // Rescue types
  AdminRescue,
  RescueListResponse,
  RescueFilters,
  RescueVerificationStatus,

  // Metrics types
  PlatformMetrics,

  // Audit types
  AuditLog,
  AuditLogFilters,
  AuditLogResponse,
  AuditLogAction,

  // Config types
  FeatureFlag,
  SystemSetting,
  SystemHealth,

  // Analytics types
  AnalyticsData,

  // Export types
  ExportDataType,
  ExportFormat,
} from '@adopt-dont-shop/lib-admin';
