/**
 * Development utilities for auth context
 * This module should only be used in development mode
 */

import { User } from '@/types';

export interface DevAuthUtils {
  getDevUser: () => User | null;
  setDevUser: (user: User) => void;
  clearDevUser: () => void;
  createMockToken: (userId: string) => string;
  clearDevTokens: () => void;
}

const DEV_USER_KEY = 'dev_user';

/**
 * Get development user from localStorage
 */
export const getDevUser = (): User | null => {
  if (!import.meta.env.DEV) {
    return null;
  }

  try {
    const devUser = localStorage.getItem(DEV_USER_KEY);
    return devUser ? JSON.parse(devUser) : null;
  } catch (error) {
    console.error('Failed to parse dev user:', error);
    return null;
  }
};

/**
 * Set development user in localStorage with mock token
 */
export const setDevUser = (user: User): void => {
  if (!import.meta.env.DEV) {
    return;
  }

  // Store dev user data (tokens are in HttpOnly cookies)
  localStorage.setItem(DEV_USER_KEY, JSON.stringify(user));
};

/**
 * Clear development user and tokens
 */
export const clearDevUser = (): void => {
  if (!import.meta.env.DEV) {
    return;
  }

  localStorage.removeItem(DEV_USER_KEY);
  clearDevTokens();
};

/**
 * Create a mock token for development
 */
export const createMockToken = (userId: string): string => {
  return `dev-token-${userId}-${Date.now()}`;
};

/**
 * Clear development tokens (no-op: tokens are in HttpOnly cookies)
 */
export const clearDevTokens = (): void => {
  // Tokens are stored in HttpOnly cookies — nothing to clear from localStorage
};

/**
 * Initialize development auth state
 * Returns true if dev user was found and initialized
 */
export const initializeDevAuth = (): User | null => {
  if (!import.meta.env.DEV) {
    return null;
  }

  const devUser = getDevUser();
  if (!devUser) {
    return null;
  }

  return devUser;
};

/**
 * Update development user profile
 */
export const updateDevUserProfile = (user: User, profileData: Partial<User>): User => {
  if (!import.meta.env.DEV) {
    return user;
  }

  const updatedUser = { ...user, ...profileData };
  setDevUser(updatedUser);
  return updatedUser;
};

/**
 * Development utilities object for easy import
 */
export const devAuthUtils: DevAuthUtils = {
  getDevUser,
  setDevUser,
  clearDevUser,
  createMockToken,
  isDevTokenValid,
  clearDevTokens,
};
