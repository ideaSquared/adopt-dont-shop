import { ApiService } from '@adopt-dont-shop/lib.api';
import {
  AnalyticsServiceConfig,
  UserEngagementEvent,
  PageViewEvent,
  UserJourney,
  TimeRange,
  EngagementMetrics,
  SystemPerformanceMetrics,
  ReportType,
  ReportParams,
  AnalyticsReport,
  AnalyticsQueryOptions,
  ConversionFunnel,
  ABTestResults,
} from '../types';

/**
 * AnalyticsService - Comprehensive user behavior tracking and analytics
 */
export class AnalyticsService {
  private config: AnalyticsServiceConfig;
  private apiService: ApiService;
  private sessionId: string;
  private eventQueue: UserEngagementEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<AnalyticsServiceConfig> = {}, apiService?: ApiService) {
    this.config = {
      debug: false,
      provider: 'internal',
      autoTrackPageViews: true,
      sessionTimeout: 30,
      sampleRate: 100,
      ...config,
    };

    this.apiService = apiService || new ApiService();
    this.sessionId = this.generateSessionId();

    if (this.config.debug) {
      console.log(`${AnalyticsService.name} initialized with config:`, this.config);
    }

    this.initializeAnalytics();
  }

  /**
   * Initialize analytics tracking
   */
  private initializeAnalytics(): void {
    if (typeof window !== 'undefined' && this.config.autoTrackPageViews) {
      this.setupPageViewTracking();
    }

    // Start event flush timer
    this.startEventFlushTimer();
  }

  /**
   * Setup automatic page view tracking
   */
  private setupPageViewTracking(): void {
    // Track initial page view
    this.trackPageView({
      url: window.location.href,
      title: document.title,
      sessionId: this.sessionId,
      timestamp: new Date(),
      referrer: document.referrer,
    });

    // Track navigation changes (for SPAs)
    if (typeof window.history !== 'undefined') {
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;

      window.history.pushState = (...args) => {
        originalPushState.apply(window.history, args);
        setTimeout(
          () =>
            this.trackPageView({
              url: window.location.href,
              title: document.title,
              sessionId: this.sessionId,
              timestamp: new Date(),
              referrer: document.referrer,
            }),
          0
        );
      };

      window.history.replaceState = (...args) => {
        originalReplaceState.apply(window.history, args);
        setTimeout(
          () =>
            this.trackPageView({
              url: window.location.href,
              title: document.title,
              sessionId: this.sessionId,
              timestamp: new Date(),
              referrer: document.referrer,
            }),
          0
        );
      };

      window.addEventListener('popstate', () => {
        this.trackPageView({
          url: window.location.href,
          title: document.title,
          sessionId: this.sessionId,
          timestamp: new Date(),
          referrer: document.referrer,
        });
      });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start event flush timer
   */
  private startEventFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushEventQueue();
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Flush queued events to server
   */
  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.apiService.post('/api/v1/analytics/events/batch', {
        events,
        sessionId: this.sessionId,
      });

      if (this.config.debug) {
        console.log(`${AnalyticsService.name} flushed ${events.length} events`);
      }
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...events);

      if (this.config.debug) {
        console.error(`${AnalyticsService.name} failed to flush events:`, error);
      }
    }
  }

  /**
   * Check if event should be sampled
   */
  private shouldSampleEvent(): boolean {
    return Math.random() * 100 < (this.config.sampleRate || 100);
  }

  /**
   * Get current configuration
   */
  public getConfig(): AnalyticsServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  public updateConfig(updates: Partial<AnalyticsServiceConfig>): void {
    this.config = { ...this.config, ...updates };

    if (this.config.debug) {
      console.log(`${AnalyticsService.name} config updated:`, this.config);
    }
  }

  /**
   * Track user engagement event
   */
  public async trackEvent(
    event: Omit<UserEngagementEvent, 'sessionId' | 'timestamp'>
  ): Promise<void> {
    if (!this.shouldSampleEvent()) return;

    const fullEvent: UserEngagementEvent = {
      ...event,
      sessionId: this.sessionId,
      timestamp: new Date(),
      url: typeof window !== 'undefined' ? window.location.href : event.url,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    };

    // Add to queue for batch processing
    this.eventQueue.push(fullEvent);

    // For high-priority events, flush immediately
    if (event.category === 'critical' || event.action === 'error') {
      await this.flushEventQueue();
    }

    if (this.config.debug) {
      console.log(`${AnalyticsService.name} tracked event:`, fullEvent);
    }
  }

  /**
   * Track page view
   */
  public async trackPageView(
    pageView: Omit<PageViewEvent, 'sessionId' | 'timestamp'> | PageViewEvent
  ): Promise<void> {
    if (!this.shouldSampleEvent()) return;

    const fullPageView: PageViewEvent = {
      sessionId: this.sessionId,
      timestamp: new Date(),
      ...pageView,
    };

    try {
      await this.apiService.post('/api/v1/analytics/pageviews', fullPageView);

      if (this.config.debug) {
        console.log(`${AnalyticsService.name} tracked page view:`, fullPageView);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(`${AnalyticsService.name} failed to track page view:`, error);
      }
    }
  }

  /**
   * Track user journey
   */
  public async trackUserJourney(journey: UserJourney): Promise<void> {
    try {
      await this.apiService.post('/api/v1/analytics/journeys', journey);

      if (this.config.debug) {
        console.log(`${AnalyticsService.name} tracked user journey:`, journey.journeyId);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(`${AnalyticsService.name} failed to track user journey:`, error);
      }
      throw error;
    }
  }

  /**
   * Get engagement metrics for a time range
   */
  public async getEngagementMetrics(
    timeRange: TimeRange,
    options: AnalyticsQueryOptions = {}
  ): Promise<EngagementMetrics> {
    try {
      const params = new URLSearchParams({
        startDate: timeRange.start.toISOString(),
        endDate: timeRange.end.toISOString(),
        timezone: timeRange.timezone || 'UTC',
        useCache: String(options.useCache ?? true),
        cacheTtl: String(options.cacheTtl ?? 300),
      });

      const response = (await this.apiService.get(
        `/api/v1/analytics/engagement?${params}`
      )) as EngagementMetrics;

      if (this.config.debug) {
        console.log(`${AnalyticsService.name} retrieved engagement metrics for period:`, timeRange);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${AnalyticsService.name} failed to get engagement metrics:`, error);
      }
      throw error;
    }
  }

  /**
   * Get system performance metrics
   */
  public async getSystemPerformance(
    timeRange: TimeRange,
    options: AnalyticsQueryOptions = {}
  ): Promise<SystemPerformanceMetrics> {
    try {
      const params = new URLSearchParams({
        startDate: timeRange.start.toISOString(),
        endDate: timeRange.end.toISOString(),
        timezone: timeRange.timezone || 'UTC',
        useCache: String(options.useCache ?? true),
      });

      const response = (await this.apiService.get(
        `/api/v1/analytics/performance?${params}`
      )) as SystemPerformanceMetrics;

      if (this.config.debug) {
        console.log(
          `${AnalyticsService.name} retrieved performance metrics for period:`,
          timeRange
        );
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${AnalyticsService.name} failed to get performance metrics:`, error);
      }
      throw error;
    }
  }

  /**
   * Generate analytics report
   */
  public async generateReport(
    type: ReportType,
    params: ReportParams,
    options: AnalyticsQueryOptions = {}
  ): Promise<AnalyticsReport> {
    try {
      const requestData = {
        type,
        parameters: params,
        options,
      };

      const response = (await this.apiService.post(
        '/api/v1/analytics/reports/generate',
        requestData
      )) as AnalyticsReport;

      if (this.config.debug) {
        console.log(`${AnalyticsService.name} generated ${type} report:`, response.id);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${AnalyticsService.name} failed to generate report:`, error);
      }
      throw error;
    }
  }

  /**
   * Get conversion funnel analysis
   */
  public async getConversionFunnel(
    funnelName: string,
    timeRange: TimeRange
  ): Promise<ConversionFunnel> {
    try {
      const params = new URLSearchParams({
        name: funnelName,
        startDate: timeRange.start.toISOString(),
        endDate: timeRange.end.toISOString(),
        timezone: timeRange.timezone || 'UTC',
      });

      const response = (await this.apiService.get(
        `/api/v1/analytics/funnels?${params}`
      )) as ConversionFunnel;

      if (this.config.debug) {
        console.log(`${AnalyticsService.name} retrieved funnel analysis:`, funnelName);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${AnalyticsService.name} failed to get funnel analysis:`, error);
      }
      throw error;
    }
  }

  /**
   * Get A/B test results
   */
  public async getABTestResults(testId: string): Promise<ABTestResults> {
    try {
      const response = (await this.apiService.get(
        `/api/v1/analytics/ab-tests/${testId}`
      )) as ABTestResults;

      if (this.config.debug) {
        console.log(`${AnalyticsService.name} retrieved A/B test results:`, testId);
      }

      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${AnalyticsService.name} failed to get A/B test results:`, error);
      }
      throw error;
    }
  }

  /**
   * Track custom conversion event
   */
  public async trackConversion(
    conversionType: string,
    value?: number,
    properties?: Record<string, unknown>
  ): Promise<void> {
    await this.trackEvent({
      category: 'conversion',
      action: conversionType,
      value,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track error event
   */
  public async trackError(error: string, context?: Record<string, unknown>): Promise<void> {
    await this.trackEvent({
      category: 'error',
      action: 'application_error',
      label: error,
      properties: {
        ...context,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track performance timing
   */
  public async trackTiming(
    category: string,
    variable: string,
    time: number,
    label?: string
  ): Promise<void> {
    await this.trackEvent({
      category: 'timing',
      action: `${category}_${variable}`,
      label,
      value: time,
      properties: {
        category,
        variable,
        time,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Start new session
   */
  public startNewSession(): void {
    this.sessionId = this.generateSessionId();

    if (this.config.debug) {
      console.log(`${AnalyticsService.name} started new session:`, this.sessionId);
    }
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.apiService.get('/api/v1/analytics/health');
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${AnalyticsService.name} health check failed:`, error);
      }
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush any remaining events
    this.flushEventQueue();

    if (this.config.debug) {
      console.log(`${AnalyticsService.name} destroyed`);
    }
  }
}
