import type { ServiceConfig } from '@adopt-dont-shop/lib.types';

/**
 * Configuration options for AnalyticsService
 */
export type AnalyticsServiceConfig = ServiceConfig & {
  /**
   * Analytics provider configuration
   */
  provider?: 'internal' | 'google-analytics' | 'mixpanel' | 'custom';

  /**
   * Third-party analytics tracking ID
   */
  trackingId?: string;

  /**
   * Enable automatic page view tracking
   */
  autoTrackPageViews?: boolean;

  /**
   * Session timeout in minutes
   */
  sessionTimeout?: number;

  /**
   * Sample rate for events (0-100)
   */
  sampleRate?: number;
};

/**
 * User engagement event tracking
 */
export interface UserEngagementEvent {
  /**
   * Event category (e.g., 'user_interaction', 'pet_discovery', 'adoption')
   */
  category: string;

  /**
   * Event action (e.g., 'click', 'view', 'share', 'apply')
   */
  action: string;

  /**
   * Event label (optional additional description)
   */
  label?: string;

  /**
   * Numeric value associated with the event
   */
  value?: number;

  /**
   * User ID (if authenticated)
   */
  userId?: string;

  /**
   * Session ID
   */
  sessionId: string;

  /**
   * Event timestamp
   */
  timestamp: Date;

  /**
   * Additional custom properties
   */
  properties?: Record<string, unknown>;

  /**
   * URL where event occurred
   */
  url?: string;

  /**
   * User agent information
   */
  userAgent?: string;

  /**
   * Referrer URL
   */
  referrer?: string;
}

/**
 * Page view tracking data
 */
export interface PageViewEvent {
  /**
   * Page URL
   */
  url: string;

  /**
   * Page title
   */
  title: string;

  /**
   * User ID (if authenticated)
   */
  userId?: string;

  /**
   * Session ID
   */
  sessionId: string;

  /**
   * Timestamp of page view
   */
  timestamp: Date;

  /**
   * Time spent on previous page (if available)
   */
  timeOnPreviousPage?: number;

  /**
   * Referrer URL
   */
  referrer?: string;

  /**
   * Additional page properties
   */
  properties?: Record<string, unknown>;
}

// ADS-262: response envelopes are owned by @adopt-dont-shop/lib.types.
export type { BaseResponse, ErrorResponse, PaginatedResponse } from '@adopt-dont-shop/lib.types';
