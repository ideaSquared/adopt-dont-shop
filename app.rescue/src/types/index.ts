// Export all types from libraries and app-specific types
export * from './auth';
export * from './api';

// Re-export key types for convenience
export type { User, LoginRequest, RegisterRequest, AuthResponse } from '@adopt-dont-shop/lib-auth';
export type { ApiResponse, PaginatedResponse } from '@adopt-dont-shop/lib-api';
export type { Application, ApplicationStatus } from '@adopt-dont-shop/lib-applications';
