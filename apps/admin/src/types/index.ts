export type { PaginatedResponse } from '@adopt-dont-shop/lib.types';

// Re-export User types from user.ts (admin-specific shape with nullable fields)
export type { User, AdminUser, UserType, UserStatus } from './user';
export { ADMIN_USER_TYPES } from './user';
