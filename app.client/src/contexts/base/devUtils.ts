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
  isDevTokenValid: (token: string | null) => boolean;
  clearDevTokens: () => void;
}

const DEV_USER_KEY = 'dev_user';
const ACCESS_TOKEN_KEY = 'accessToken';
const AUTH_TOKEN_KEY = 'authToken';

/**
 * Get development user from localStorage
 */
export const getDevUser = (): User | null => {
  if (!import.meta.env.DEV) return null;

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
  if (!import.meta.env.DEV) return;

  // Store dev user
  localStorage.setItem(DEV_USER_KEY, JSON.stringify(user));

  // Create and store mock token
  const mockToken = createMockToken(user.userId);
  localStorage.setItem(ACCESS_TOKEN_KEY, mockToken);
  localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
};

/**
 * Clear development user and tokens
 */
export const clearDevUser = (): void => {
  if (!import.meta.env.DEV) return;

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
 * Check if a token is a valid dev token
 */
export const isDevTokenValid = (token: string | null): boolean => {
  if (!import.meta.env.DEV || !token) return false;
  return token.startsWith('dev-token-');
};

/**
 * Clear development tokens
 */
export const clearDevTokens = (): void => {
  if (!import.meta.env.DEV) return;

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (isDevTokenValid(token)) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

/**
 * Initialize development auth state
 * Returns true if dev user was found and initialized
 */
export const initializeDevAuth = (): User | null => {
  if (!import.meta.env.DEV) return null;

  const devUser = getDevUser();
  if (!devUser) return null;

  // Ensure dev user has a mock token
  const existingToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!isDevTokenValid(existingToken)) {
    const mockToken = createMockToken(devUser.userId);
    localStorage.setItem(ACCESS_TOKEN_KEY, mockToken);
    localStorage.setItem(AUTH_TOKEN_KEY, mockToken);
  }

  return devUser;
};

/**
 * Update development user profile
 */
export const updateDevUserProfile = (user: User, profileData: Partial<User>): User => {
  if (!import.meta.env.DEV) return user;

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
