/**
 * Configuration options for DiscoveryService
 */
export interface DiscoveryServiceConfig {
  /**
   * API base URL
   */
  apiUrl?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Custom headers to include with requests
   */
  headers?: Record<string, string>;
}

/**
 * Options for DiscoveryService operations
 */
export interface DiscoveryServiceOptions {
  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether to use caching
   */
  useCache?: boolean;

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

// ADS-262: response envelopes are owned by @adopt-dont-shop/lib.types.
export type { BaseResponse, ErrorResponse, PaginatedResponse } from '@adopt-dont-shop/lib.types';

// Discovery-specific interfaces

export interface SwipeSession {
  sessionId: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  totalSwipes: number;
  likes: number;
  passes: number;
  superLikes: number;
  filters: PetSearchFilters;
}

export interface SwipeAction {
  action: 'like' | 'pass' | 'super_like' | 'info';
  petId: string;
  timestamp: string;
  sessionId: string;
}

export interface PetDiscoveryQueue {
  pets: DiscoveryPet[];
  currentIndex: number;
  hasMore: boolean;
  nextBatchSize: number;
}

export interface SwipeStats {
  totalSessions: number;
  totalSwipes: number;
  totalLikes: number;
  totalPasses: number;
  totalSuperLikes: number;
  likeToSwipeRatio: number;
  averageSessionDuration: number;
  favoriteBreeds: string[];
  favoriteAgeGroups: string[];
}

export interface DiscoveryPet {
  petId: string;
  name: string;
  type: 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
  breed?: string;
  ageGroup: 'baby' | 'young' | 'adult' | 'senior';
  ageYears?: number;
  ageMonths?: number;
  size: 'extra_small' | 'small' | 'medium' | 'large' | 'extra_large';
  gender: 'male' | 'female' | 'unknown';
  images: string[];
  shortDescription?: string;
  distance?: number;
  rescueName: string;
  isSponsored?: boolean;
  compatibilityScore?: number;
}

export interface DiscoveryQueue {
  pets: DiscoveryPet[];
  sessionId: string;
  hasMore: boolean;
  nextCursor?: string;
}

export interface PetSearchFilters {
  type?: string;
  breed?: string;
  ageGroup?: string;
  size?: string;
  gender?: string;
  location?: string;
  maxDistance?: number;
  search?: string;
}

export interface DiscoveryQueueResponse {
  pets: DiscoveryPet[];
  currentIndex: number;
  hasMore: boolean;
  nextBatchSize: number;
}

export interface LoadMorePetsResponse {
  pets: DiscoveryPet[];
}

export interface SessionStats {
  sessionId: string;
  totalSwipes: number;
  likes: number;
  passes: number;
  superLikes: number;
  duration: number;
}
