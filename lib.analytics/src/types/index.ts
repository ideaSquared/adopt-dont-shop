/**
 * Configuration options for AnalyticsService
 */
export interface AnalyticsServiceConfig {
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
}

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
 * Engagement metrics response
 */
export interface EngagementMetrics {
  /**
   * Time period for metrics
   */
  period: TimeRange;

  /**
   * Total page views
   */
  pageViews: number;

  /**
   * Unique page views
   */
  uniquePageViews: number;

  /**
   * Total sessions
   */
  sessions: number;

  /**
   * Unique users
   */
  uniqueUsers: number;

  /**
   * Average session duration (seconds)
   */
  avgSessionDuration: number;

  /**
   * Bounce rate (percentage)
   */
  bounceRate: number;

  /**
   * Top pages by views
   */
  topPages: Array<{
    url: string;
    title: string;
    views: number;
    uniqueViews: number;
  }>;

  /**
   * Top events by count
   */
  topEvents: Array<{
    category: string;
    action: string;
    count: number;
  }>;

  /**
   * User acquisition channels
   */
  acquisitionChannels: Array<{
    channel: string;
    users: number;
    sessions: number;
    conversionRate: number;
  }>;

  /**
   * Device/platform breakdown
   */
  deviceBreakdown: Array<{
    device: string;
    users: number;
    percentage: number;
  }>;
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
 * Analytics report types
 */
export type ReportType =
  | 'engagement'
  | 'performance'
  | 'user-journey'
  | 'conversion-funnel'
  | 'retention'
  | 'acquisition'
  | 'custom';

/**
 * Report generation parameters
 */
export interface ReportParams {
  /**
   * Time range for report
   */
  timeRange: TimeRange;

  /**
   * Report granularity
   */
  granularity?: 'hour' | 'day' | 'week' | 'month';

  /**
   * Filters to apply
   */
  filters?: Record<string, unknown>;

  /**
   * Metrics to include
   */
  metrics?: string[];

  /**
   * Dimensions to group by
   */
  dimensions?: string[];

  /**
   * Report format
   */
  format?: 'json' | 'csv' | 'pdf';
}

/**
 * Generated analytics report
 */
export interface AnalyticsReport {
  /**
   * Report ID
   */
  id: string;

  /**
   * Report type
   */
  type: ReportType;

  /**
   * Report parameters used
   */
  parameters: ReportParams;

  /**
   * Report generation timestamp
   */
  generatedAt: Date;

  /**
   * Report data
   */
  data: Record<string, unknown>;

  /**
   * Summary statistics
   */
  summary?: Record<string, number>;

  /**
   * Download URL (if applicable)
   */
  downloadUrl?: string;

  /**
   * Report expiration date
   */
  expiresAt?: Date;
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

/**
 * Conversion funnel step
 */
export interface FunnelStep {
  /**
   * Step name
   */
  name: string;

  /**
   * Step order
   */
  order: number;

  /**
   * Event criteria for this step
   */
  criteria: {
    category?: string;
    action?: string;
    url?: string;
    properties?: Record<string, unknown>;
  };

  /**
   * Number of users who completed this step
   */
  users: number;

  /**
   * Conversion rate from previous step
   */
  conversionRate: number;

  /**
   * Drop-off rate from previous step
   */
  dropOffRate: number;
}

/**
 * Conversion funnel analysis
 */
export interface ConversionFunnel {
  /**
   * Funnel name
   */
  name: string;

  /**
   * Time period analyzed
   */
  period: TimeRange;

  /**
   * Funnel steps
   */
  steps: FunnelStep[];

  /**
   * Overall conversion rate
   */
  overallConversionRate: number;

  /**
   * Total users who entered funnel
   */
  totalUsers: number;

  /**
   * Users who completed funnel
   */
  convertedUsers: number;
}

/**
 * A/B test variant data
 */
export interface ABTestVariant {
  /**
   * Variant name
   */
  name: string;

  /**
   * Variant traffic percentage
   */
  trafficPercentage: number;

  /**
   * Number of users in variant
   */
  users: number;

  /**
   * Conversion rate for variant
   */
  conversionRate: number;

  /**
   * Statistical significance
   */
  significance?: number;
}

/**
 * A/B test results
 */
export interface ABTestResults {
  /**
   * Test ID
   */
  testId: string;

  /**
   * Test name
   */
  name: string;

  /**
   * Test period
   */
  period: TimeRange;

  /**
   * Test status
   */
  status: 'running' | 'completed' | 'paused';

  /**
   * Test variants
   */
  variants: ABTestVariant[];

  /**
   * Winner variant (if determined)
   */
  winner?: string;

  /**
   * Confidence level
   */
  confidence?: number;
}

/**
 * Base response interface
 */
export interface BaseResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
