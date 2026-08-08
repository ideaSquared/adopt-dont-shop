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

/**
 * User journey tracking
 */
export interface UserJourney {
  /**
   * Journey ID
   */
  journeyId: string;

  /**
   * User ID (if authenticated)
   */
  userId?: string;

  /**
   * Session ID
   */
  sessionId: string;

  /**
   * Journey start timestamp
   */
  startTime: Date;

  /**
   * Journey end timestamp
   */
  endTime?: Date;

  /**
   * Journey steps/events
   */
  steps: UserEngagementEvent[];

  /**
   * Journey outcome (e.g., 'conversion', 'abandonment', 'incomplete')
   */
  outcome?: string;

  /**
   * Journey funnel stage
   */
  funnelStage?: string;

  /**
   * Additional journey metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Time range for analytics queries
 */
export interface TimeRange {
  /**
   * Start date
   */
  start: Date;

  /**
   * End date
   */
  end: Date;

  /**
   * Timezone (default: UTC)
   */
  timezone?: string;
}

/**
 * System performance metrics
 */
export interface SystemPerformanceMetrics {
  /**
   * Time period for metrics
   */
  period: TimeRange;

  /**
   * Average page load time (milliseconds)
   */
  avgPageLoadTime: number;

  /**
   * 95th percentile page load time
   */
  p95PageLoadTime: number;

  /**
   * First contentful paint time
   */
  avgFirstContentfulPaint: number;

  /**
   * Largest contentful paint time
   */
  avgLargestContentfulPaint: number;

  /**
   * Cumulative layout shift score
   */
  avgCumulativeLayoutShift: number;

  /**
   * Error rate (percentage)
   */
  errorRate: number;

  /**
   * Most common errors
   */
  topErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;

  /**
   * API response times
   */
  apiPerformance: Array<{
    endpoint: string;
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  }>;
}

/**
 * Analytics query options
 */
export interface AnalyticsQueryOptions {
  /**
   * Query timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether to use cached results
   */
  useCache?: boolean;

  /**
   * Cache TTL in seconds
   */
  cacheTtl?: number;

  /**
   * Whether to include debugging info
   */
  includeDebugInfo?: boolean;
}

// ADS-262: response envelopes are owned by @adopt-dont-shop/lib.types.
export type { BaseResponse, ErrorResponse, PaginatedResponse } from '@adopt-dont-shop/lib.types';
