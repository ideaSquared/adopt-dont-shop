/**
 * Advanced Analytics Service
 * User engagement tracking and performance analytics
 * Part of Phase 3 - Advanced Analytics Implementation
 */

export interface UserEngagementEvent {
  userId: string;
  sessionId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestamp: string;
  conversationId?: string;
  messageId?: string;
  petId?: string;
  rescueId?: string;
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  averageSessionDuration: number;
  messagesPerSession: number;
  conversationsStarted: number;
  searchQueries: number;
  mostActiveHours: Array<{ hour: number; count: number }>;
  popularSearchTerms: Array<{ term: string; count: number }>;
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export interface SystemPerformanceMetrics {
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  activeConnections: number;
  messageDeliveryRate: number;
  searchPerformance: {
    averageSearchTime: number;
    cacheHitRate: number;
    popularQueries: Array<{ query: string; count: number; avgTime: number }>;
  };
}

class AdvancedAnalyticsService {
  private events: UserEngagementEvent[] = [];
  private sessionData = new Map<
    string,
    { startTime: number; events: number; lastActivity: number }
  >();
  private readonly maxEvents = 10000; // Keep last 10k events in memory

  // Performance tracking
  private performanceMetrics = {
    apiCalls: new Map<string, { count: number; totalTime: number; errors: number }>(),
    searches: new Map<string, { count: number; totalTime: number; results: number }>(),
    cacheStats: { hits: 0, misses: 0 },
  };

  /**
   * Track user engagement event
   */
  trackEvent(event: Omit<UserEngagementEvent, 'timestamp'>): void {
    const fullEvent: UserEngagementEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Add to events array
    this.events.push(fullEvent);

    // Trim events if we exceed max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Update session data
    this.updateSessionData(event.sessionId);

    // Send to external analytics if configured
    this.sendToExternalAnalytics(fullEvent);

    // Log important events in development
    if (this.isImportantEvent(event.eventType)) {
      this.debugLog('Analytics Event:', {
        type: event.eventType,
        user: event.userId,
        data: event.eventData,
      });
    }
  }

  /**
   * Track API performance
   */
  trackApiPerformance(
    endpoint: string,
    method: string,
    responseTime: number,
    success: boolean
  ): void {
    const key = `${method} ${endpoint}`;
    const existing = this.performanceMetrics.apiCalls.get(key) || {
      count: 0,
      totalTime: 0,
      errors: 0,
    };

    this.performanceMetrics.apiCalls.set(key, {
      count: existing.count + 1,
      totalTime: existing.totalTime + responseTime,
      errors: existing.errors + (success ? 0 : 1),
    });
  }

  /**
   * Track search performance
   */
  trackSearchPerformance(query: string, responseTime: number, resultCount: number): void {
    const existing = this.performanceMetrics.searches.get(query) || {
      count: 0,
      totalTime: 0,
      results: 0,
    };

    this.performanceMetrics.searches.set(query, {
      count: existing.count + 1,
      totalTime: existing.totalTime + responseTime,
      results: existing.results + resultCount,
    });
  }

  /**
   * Track cache performance
   */
  trackCacheHit(hit: boolean): void {
    if (hit) {
      this.performanceMetrics.cacheStats.hits++;
    } else {
      this.performanceMetrics.cacheStats.misses++;
    }
  }

  /**
   * Get user engagement metrics
   */
  getEngagementMetrics(timeRange: '24h' | '7d' | '30d' = '24h'): EngagementMetrics {
    const cutoff = this.getCutoffTime(timeRange);
    const recentEvents = this.events.filter(event => new Date(event.timestamp) > cutoff);

    // Calculate metrics
    const uniqueUsers = new Set(recentEvents.map(e => e.userId)).size;
    const sessions = this.calculateSessionMetrics(recentEvents);
    const hourlyDistribution = this.calculateHourlyDistribution(recentEvents);
    const searchTerms = this.extractSearchTerms(recentEvents);

    return {
      dailyActiveUsers: uniqueUsers,
      averageSessionDuration: sessions.averageDuration,
      messagesPerSession: sessions.averageMessages,
      conversationsStarted: recentEvents.filter(e => e.eventType === 'conversation_started').length,
      searchQueries: recentEvents.filter(e => e.eventType === 'search_performed').length,
      mostActiveHours: hourlyDistribution,
      popularSearchTerms: searchTerms,
      userRetention: this.calculateRetention(),
    };
  }

  /**
   * Get system performance metrics
   */
  getPerformanceMetrics(): SystemPerformanceMetrics {
    const apiMetrics = Array.from(this.performanceMetrics.apiCalls.values());
    const searchMetrics = Array.from(this.performanceMetrics.searches.entries());
    const cacheStats = this.performanceMetrics.cacheStats;

    const avgResponseTime =
      apiMetrics.length > 0
        ? apiMetrics.reduce((sum, m) => sum + m.totalTime / m.count, 0) / apiMetrics.length
        : 0;

    const errorRate =
      apiMetrics.length > 0
        ? apiMetrics.reduce((sum, m) => sum + m.errors, 0) /
          apiMetrics.reduce((sum, m) => sum + m.count, 0)
        : 0;

    const cacheHitRate =
      cacheStats.hits + cacheStats.misses > 0
        ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100
        : 0;

    return {
      averageResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100 * 100) / 100, // Percentage with 2 decimals
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      activeConnections: this.getActiveConnectionsCount(),
      messageDeliveryRate: this.calculateMessageDeliveryRate(),
      searchPerformance: {
        averageSearchTime:
          searchMetrics.length > 0
            ? Math.round(
                searchMetrics.reduce((sum, [, m]) => sum + m.totalTime / m.count, 0) /
                  searchMetrics.length
              )
            : 0,
        cacheHitRate: cacheHitRate,
        popularQueries: searchMetrics
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, 10)
          .map(([query, metrics]) => ({
            query,
            count: metrics.count,
            avgTime: Math.round(metrics.totalTime / metrics.count),
          })),
      },
    };
  }

  /**
   * Get dashboard data combining engagement and performance
   */
  getDashboardData(timeRange: '24h' | '7d' | '30d' = '24h') {
    return {
      engagement: this.getEngagementMetrics(timeRange),
      performance: this.getPerformanceMetrics(),
      timestamp: new Date().toISOString(),
      timeRange,
    };
  }

  /**
   * Clear old data to prevent memory leaks
   */
  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // Keep 24 hours

    // Clear old events
    this.events = this.events.filter(event => new Date(event.timestamp).getTime() > cutoff);

    // Clear old sessions
    for (const [sessionId, data] of this.sessionData.entries()) {
      if (data.lastActivity < cutoff) {
        this.sessionData.delete(sessionId);
      }
    }
  }

  // Private helper methods
  private getCutoffTime(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private updateSessionData(sessionId: string): void {
    const now = Date.now();
    const existing = this.sessionData.get(sessionId);

    if (existing) {
      this.sessionData.set(sessionId, {
        ...existing,
        events: existing.events + 1,
        lastActivity: now,
      });
    } else {
      this.sessionData.set(sessionId, {
        startTime: now,
        events: 1,
        lastActivity: now,
      });
    }
  }

  private calculateSessionMetrics(events: UserEngagementEvent[]) {
    const sessionEvents = new Map<string, UserEngagementEvent[]>();

    events.forEach(event => {
      const existing = sessionEvents.get(event.sessionId) || [];
      sessionEvents.set(event.sessionId, [...existing, event]);
    });

    const sessionDurations: number[] = [];
    const messageCounts: number[] = [];

    sessionEvents.forEach(sessionEventList => {
      if (sessionEventList.length > 1) {
        const start = new Date(sessionEventList[0].timestamp).getTime();
        const end = new Date(sessionEventList[sessionEventList.length - 1].timestamp).getTime();
        sessionDurations.push(end - start);
      }

      const messageCount = sessionEventList.filter(e => e.eventType === 'message_sent').length;
      messageCounts.push(messageCount);
    });

    return {
      averageDuration:
        sessionDurations.length > 0
          ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length / 1000)
          : 0,
      averageMessages:
        messageCounts.length > 0
          ? Math.round((messageCounts.reduce((a, b) => a + b, 0) / messageCounts.length) * 10) / 10
          : 0,
    };
  }

  private calculateHourlyDistribution(events: UserEngagementEvent[]) {
    const hourCounts = new Array(24).fill(0);

    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour]++;
    });

    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }

  private extractSearchTerms(events: UserEngagementEvent[]) {
    const searchEvents = events.filter(e => e.eventType === 'search_performed');
    const termCounts = new Map<string, number>();

    searchEvents.forEach(event => {
      const query = event.eventData.query as string;
      if (query) {
        const terms = query
          .toLowerCase()
          .split(/\s+/)
          .filter(term => term.length > 2);
        terms.forEach(term => {
          termCounts.set(term, (termCounts.get(term) || 0) + 1);
        });
      }
    });

    return Array.from(termCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }));
  }

  private calculateRetention() {
    // Simplified retention calculation - would need user registration dates for accurate calculation
    const now = Date.now();
    const day1 = now - 24 * 60 * 60 * 1000;
    const day7 = now - 7 * 24 * 60 * 60 * 1000;
    const day30 = now - 30 * 24 * 60 * 60 * 1000;

    const usersDay1 = new Set(
      this.events.filter(e => new Date(e.timestamp).getTime() > day1).map(e => e.userId)
    ).size;
    const usersDay7 = new Set(
      this.events.filter(e => new Date(e.timestamp).getTime() > day7).map(e => e.userId)
    ).size;
    const usersDay30 = new Set(
      this.events.filter(e => new Date(e.timestamp).getTime() > day30).map(e => e.userId)
    ).size;

    return {
      day1: usersDay1,
      day7: usersDay7,
      day30: usersDay30,
    };
  }

  private getActiveConnectionsCount(): number {
    // This would typically come from WebSocket connection tracking
    return this.sessionData.size;
  }

  private calculateMessageDeliveryRate(): number {
    const messageEvents = this.events.filter(
      e => e.eventType === 'message_sent' || e.eventType === 'message_delivered'
    );

    const sent = messageEvents.filter(e => e.eventType === 'message_sent').length;
    const delivered = messageEvents.filter(e => e.eventType === 'message_delivered').length;

    return sent > 0 ? Math.round((delivered / sent) * 100 * 100) / 100 : 100;
  }

  private sendToExternalAnalytics(event: UserEngagementEvent): void {
    // Integration point for external analytics services (Google Analytics, Mixpanel, etc.)
    if (typeof window !== 'undefined') {
      const windowWithGtag = window as typeof window & {
        gtag?: (command: string, eventName: string, parameters: Record<string, unknown>) => void;
      };

      if (windowWithGtag.gtag) {
        windowWithGtag.gtag('event', event.eventType, {
          user_id: event.userId,
          session_id: event.sessionId,
          custom_data: event.eventData,
        });
      }
    }
  }

  private isImportantEvent(eventType: string): boolean {
    const importantEvents = [
      'conversation_started',
      'message_sent',
      'search_performed',
      'error_occurred',
      'user_registered',
      'user_login',
    ];
    return importantEvents.includes(eventType);
  }

  /**
   * Debug logging for development
   */
  private debugLog(message: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[Analytics] ${message}`, data);
    }
  }
}

// Export singleton instance
export const analyticsService = new AdvancedAnalyticsService();

// Auto-cleanup every hour
setInterval(
  () => {
    analyticsService.cleanup();
  },
  60 * 60 * 1000
);
