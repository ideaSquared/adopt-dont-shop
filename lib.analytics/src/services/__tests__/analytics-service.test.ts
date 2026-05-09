import { AnalyticsService } from '../analytics-service';
import { apiService } from '@adopt-dont-shop/lib.api';

// Mock lib.api
vi.mock('@adopt-dont-shop/lib.api', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    fetchWithAuth: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    isAuthenticated: vi.fn(),
    updateConfig: vi.fn(),
  },
  ApiService: vi.fn().mockImplementation(function () {
    return {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      fetchWithAuth: vi.fn(),
      setToken: vi.fn(),
      clearToken: vi.fn(),
      isAuthenticated: vi.fn(),
      updateConfig: vi.fn(),
    };
  }),
}));

// Mock DOM globals
// jsdom 27 (bundled with jest-environment-jsdom 30) makes window.location
// non-configurable; assigning to its href property is the supported way to
// stub it now.
window.location.href = 'https://example.com/test';

Object.defineProperty(document, 'title', {
  value: 'Test Page',
  writable: true,
});

Object.defineProperty(document, 'referrer', {
  value: 'https://example.com/previous',
  writable: true,
});

Object.defineProperty(navigator, 'userAgent', {
  value: 'Test User Agent',
  writable: true,
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockApiService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    service = new AnalyticsService({
      debug: false,
      autoTrackPageViews: false, // Disable for testing
    });

    mockApiService = service['apiService'];
  });

  afterEach(() => {
    service.destroy();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
      expect(config.provider).toBe('internal');
      expect(config.autoTrackPageViews).toBe(false);
      expect(config.sessionTimeout).toBe(30);
      expect(config.sampleRate).toBe(100);
    });

    it('should allow config updates', () => {
      service.updateConfig({ debug: true, provider: 'google-analytics' });
      const config = service.getConfig();
      expect(config.debug).toBe(true);
      expect(config.provider).toBe('google-analytics');
    });

    it('should generate unique session ID', () => {
      const sessionId1 = service.getSessionId();
      service.startNewSession();
      const sessionId2 = service.getSessionId();

      expect(sessionId1).toBeDefined();
      expect(sessionId2).toBeDefined();
      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('event tracking', () => {
    it('should track user engagement events', async () => {
      mockApiService.post.mockResolvedValue({ success: true });

      await service.trackEvent({
        category: 'user_interaction',
        action: 'click',
        label: 'adopt_button',
        value: 1,
        userId: 'user123',
        properties: { petId: 'pet456' },
      });

      // Events are queued, so we need to advance timers to trigger flush
      vi.advanceTimersByTime(5000);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/analytics/events/batch',
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({
              category: 'user_interaction',
              action: 'click',
              label: 'adopt_button',
              value: 1,
              userId: 'user123',
              sessionId: service.getSessionId(),
            }),
          ]),
          sessionId: service.getSessionId(),
        })
      );
    });

    it('should track page views', async () => {
      mockApiService.post.mockResolvedValue({ success: true });

      await service.trackPageView({
        url: 'https://example.com/pets',
        title: 'Pet Listings',
        userId: 'user123',
      });

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/analytics/pageviews',
        expect.objectContaining({
          url: 'https://example.com/pets',
          title: 'Pet Listings',
          userId: 'user123',
          sessionId: service.getSessionId(),
        })
      );
    });

    it('should track user journeys', async () => {
      mockApiService.post.mockResolvedValue({ success: true });

      const journey = {
        journeyId: 'journey123',
        userId: 'user123',
        sessionId: service.getSessionId(),
        startTime: new Date(),
        steps: [],
        outcome: 'conversion',
      };

      await service.trackUserJourney(journey);

      expect(mockApiService.post).toHaveBeenCalledWith('/api/v1/analytics/journeys', journey);
    });

    it('should track conversions', async () => {
      const trackEventSpy = vi.spyOn(service, 'trackEvent');

      await service.trackConversion('adoption_completed', 1, { petId: 'pet123' });

      expect(trackEventSpy).toHaveBeenCalledWith({
        category: 'conversion',
        action: 'adoption_completed',
        value: 1,
        properties: expect.objectContaining({
          petId: 'pet123',
          timestamp: expect.any(String),
        }),
      });
    });

    it('should track errors', async () => {
      const trackEventSpy = vi.spyOn(service, 'trackEvent');

      await service.trackError('API_ERROR', { endpoint: '/api/pets' });

      expect(trackEventSpy).toHaveBeenCalledWith({
        category: 'error',
        action: 'application_error',
        label: 'API_ERROR',
        properties: expect.objectContaining({
          endpoint: '/api/pets',
          timestamp: expect.any(String),
        }),
      });
    });

    it('should track performance timing', async () => {
      const trackEventSpy = vi.spyOn(service, 'trackEvent');

      await service.trackTiming('page', 'load', 1500, 'home_page');

      expect(trackEventSpy).toHaveBeenCalledWith({
        category: 'timing',
        action: 'page_load',
        label: 'home_page',
        value: 1500,
        properties: expect.objectContaining({
          category: 'page',
          variable: 'load',
          time: 1500,
          timestamp: expect.any(String),
        }),
      });
    });
  });

  describe('analytics queries', () => {
    it('should get engagement metrics', async () => {
      const mockMetrics = {
        period: { start: new Date(), end: new Date() },
        pageViews: 1000,
        uniquePageViews: 750,
        sessions: 500,
        uniqueUsers: 400,
        avgSessionDuration: 180,
        bounceRate: 45.5,
        topPages: [],
        topEvents: [],
        acquisitionChannels: [],
        deviceBreakdown: [],
      };

      mockApiService.get.mockResolvedValue(mockMetrics);

      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const result = await service.getEngagementMetrics(timeRange);

      expect(mockApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/engagement')
      );
      expect(result).toEqual(mockMetrics);
    });

    it('should get system performance metrics', async () => {
      const mockPerformance = {
        period: { start: new Date(), end: new Date() },
        avgPageLoadTime: 2500,
        p95PageLoadTime: 5000,
        avgFirstContentfulPaint: 1200,
        avgLargestContentfulPaint: 2000,
        avgCumulativeLayoutShift: 0.1,
        errorRate: 2.5,
        topErrors: [],
        apiPerformance: [],
      };

      mockApiService.get.mockResolvedValue(mockPerformance);

      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const result = await service.getSystemPerformance(timeRange);

      expect(mockApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/performance')
      );
      expect(result).toEqual(mockPerformance);
    });

    it('should generate analytics reports', async () => {
      const mockReport = {
        id: 'report123',
        type: 'engagement' as const,
        parameters: {},
        generatedAt: new Date(),
        data: {},
      };

      mockApiService.post.mockResolvedValue(mockReport);

      const params = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        granularity: 'day' as const,
        format: 'json' as const,
      };

      const result = await service.generateReport('engagement', params);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/analytics/reports/generate',
        expect.objectContaining({
          type: 'engagement',
          parameters: params,
        })
      );
      expect(result).toEqual(mockReport);
    });

    it('should get conversion funnel data', async () => {
      const mockFunnel = {
        name: 'adoption_funnel',
        period: { start: new Date(), end: new Date() },
        steps: [],
        overallConversionRate: 15.5,
        totalUsers: 1000,
        convertedUsers: 155,
      };

      mockApiService.get.mockResolvedValue(mockFunnel);

      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const result = await service.getConversionFunnel('adoption_funnel', timeRange);

      expect(mockApiService.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/analytics/funnels')
      );
      expect(result).toEqual(mockFunnel);
    });

    it('should get A/B test results', async () => {
      const mockResults = {
        testId: 'test123',
        name: 'Button Color Test',
        period: { start: new Date(), end: new Date() },
        status: 'completed' as const,
        variants: [],
        winner: 'variant_b',
        confidence: 95.5,
      };

      mockApiService.get.mockResolvedValue(mockResults);

      const result = await service.getABTestResults('test123');

      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/analytics/ab-tests/test123');
      expect(result).toEqual(mockResults);
    });
  });

  describe('sampling and queue management', () => {
    it('should respect sample rate', async () => {
      const sampledService = new AnalyticsService({
        sampleRate: 1,
        autoTrackPageViews: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // Justification: shouldSampleEvent is private and cannot be forced to
      // return false via the public API — the constructor normalises sampleRate
      // with `|| 100`, so sampleRate=0 silently becomes 100 (always samples).
      // Spying is the only way to reliably exercise the "event is dropped" path.
      vi.spyOn(sampledService as any, 'shouldSampleEvent').mockReturnValue(false);

      mockApiService.post.mockResolvedValue({ success: true });

      await sampledService.trackEvent({
        category: 'test',
        action: 'test',
      });

      // Advance timers so a flush would fire if there were queued events
      vi.advanceTimersByTime(5000);

      // No events should have been sent — sampling dropped them before queuing
      expect(mockApiService.post).not.toHaveBeenCalled();

      sampledService.destroy();
    });

    it('should flush event queue periodically', async () => {
      mockApiService.post.mockResolvedValue({ success: true });

      // Add multiple events
      await service.trackEvent({ category: 'test1', action: 'action1' });
      await service.trackEvent({ category: 'test2', action: 'action2' });

      // Advance timers to trigger flush
      vi.advanceTimersByTime(5000);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/analytics/events/batch',
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({ category: 'test1', action: 'action1' }),
            expect.objectContaining({ category: 'test2', action: 'action2' }),
          ]),
        })
      );
    });

    it('should flush critical events immediately', async () => {
      mockApiService.post.mockResolvedValue({ success: true });

      await service.trackEvent({
        category: 'critical',
        action: 'error',
      });

      // Should flush immediately, not wait for timer
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/analytics/events/batch',
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({ category: 'critical', action: 'error' }),
          ]),
        })
      );
    });

    it('should handle flush failure gracefully', async () => {
      // Set up the mock to fail
      mockApiService.post.mockRejectedValue(new Error('Network error'));

      await service.trackEvent({ category: 'test', action: 'test' });

      // Advance timers to trigger flush
      vi.advanceTimersByTime(5000);

      // Verify the flush was attempted
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/analytics/events/batch',
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({ category: 'test', action: 'test' }),
          ]),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully in metrics queries', async () => {
      mockApiService.get.mockRejectedValue(new Error('API Error'));

      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      await expect(service.getEngagementMetrics(timeRange)).rejects.toThrow('API Error');
    });

    it('should handle API errors gracefully in report generation', async () => {
      mockApiService.post.mockRejectedValue(new Error('Report generation failed'));

      const params = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      };

      await expect(service.generateReport('engagement', params)).rejects.toThrow(
        'Report generation failed'
      );
    });

    it('should handle page view tracking errors gracefully', async () => {
      mockApiService.post.mockRejectedValue(new Error('Page view tracking failed'));

      // Should not throw error
      await service.trackPageView({
        url: 'https://example.com/test',
        title: 'Test Page',
      });

      expect(mockApiService.post).toHaveBeenCalled();
    });
  });

  describe('cleanup and lifecycle', () => {
    it('should flush queued events to the API when destroyed', async () => {
      // Given: an event is queued before destroy (flush timer has not fired yet)
      mockApiService.post.mockResolvedValue({ success: true });
      await service.trackEvent({ category: 'test', action: 'queued' });

      // When: destroy() is called
      service.destroy();

      // Then: the queued event is sent to the API immediately (not dropped)
      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/v1/analytics/events/batch',
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({ category: 'test', action: 'queued' }),
          ]),
        })
      );
    });

    it('should start new session', () => {
      const originalSessionId = service.getSessionId();
      service.startNewSession();
      const newSessionId = service.getSessionId();

      expect(newSessionId).not.toBe(originalSessionId);
      expect(newSessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockApiService.get.mockResolvedValue({ status: 'ok' });

      const result = await service.healthCheck();
      expect(result).toBe(true);
      expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/analytics/health');
    });

    it('should return false when API is unhealthy', async () => {
      mockApiService.get.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.healthCheck();
      expect(result).toBe(false);
    });
  });
});
