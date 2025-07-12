/**
 * Performance monitoring utility for chat system
 * Tracks metrics like message delivery times, connection health, and user engagement
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ConnectionMetric {
  userId: string;
  connectionTime: number;
  disconnectionCount: number;
  lastConnected: number;
  totalSessionTime: number;
}

export interface MessageMetric {
  messageId: string;
  sendTime: number;
  deliveryTime?: number;
  readTime?: number;
  retryCount: number;
  size: number;
  messageType: 'text' | 'image' | 'file';
}

export interface UserEngagementMetric {
  userId: string;
  action: string;
  timestamp: number;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private connectionMetrics = new Map<string, ConnectionMetric>();
  private messageMetrics = new Map<string, MessageMetric>();
  private engagementMetrics: UserEngagementMetric[] = [];
  private readonly maxMetrics = 1000; // Limit stored metrics
  private analyticsCallback?: (metric: PerformanceMetric) => void;

  constructor() {
    // Clean up old metrics every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  // Set analytics callback for external integration
  setAnalyticsCallback(callback: (metric: PerformanceMetric) => void): void {
    this.analyticsCallback = callback;
  }

  // Track message sending performance
  startMessageTracking(
    messageId: string,
    messageType: 'text' | 'image' | 'file',
    size: number
  ): void {
    const metric: MessageMetric = {
      messageId,
      sendTime: Date.now(),
      retryCount: 0,
      size,
      messageType,
    };

    this.messageMetrics.set(messageId, metric);
    this.recordMetric('message_send_started', 1, { messageId, messageType, size });
  }

  // Track message delivery completion
  completeMessageDelivery(messageId: string): void {
    const metric = this.messageMetrics.get(messageId);
    if (metric && !metric.deliveryTime) {
      const deliveryTime = Date.now() - metric.sendTime;
      metric.deliveryTime = deliveryTime;

      this.recordMetric('message_delivery_time', deliveryTime, {
        messageId,
        messageType: metric.messageType,
        size: metric.size,
        retryCount: metric.retryCount,
      });
    }
  }

  // Track message read time
  trackMessageRead(messageId: string): void {
    const metric = this.messageMetrics.get(messageId);
    if (metric && !metric.readTime) {
      const readTime = Date.now() - metric.sendTime;
      metric.readTime = readTime;

      this.recordMetric('message_read_time', readTime, {
        messageId,
        messageType: metric.messageType,
      });
    }
  }

  // Track message retry
  trackMessageRetry(messageId: string): void {
    const metric = this.messageMetrics.get(messageId);
    if (metric) {
      metric.retryCount++;
      this.recordMetric('message_retry', metric.retryCount, { messageId });
    }
  }

  // Track connection performance
  startConnectionTracking(userId: string): void {
    const existing = this.connectionMetrics.get(userId);
    const now = Date.now();

    if (existing) {
      existing.lastConnected = now;
    } else {
      this.connectionMetrics.set(userId, {
        userId,
        connectionTime: now,
        disconnectionCount: 0,
        lastConnected: now,
        totalSessionTime: 0,
      });
    }

    this.recordMetric('socket_connection_started', 1, { userId });
  }

  // Track connection completion time
  completeConnectionTracking(userId: string): void {
    const metric = this.connectionMetrics.get(userId);
    if (metric) {
      const connectionTime = Date.now() - metric.connectionTime;

      this.recordMetric('socket_connection_time', connectionTime, { userId });
    }
  }

  // Track disconnection
  trackDisconnection(userId: string): void {
    const metric = this.connectionMetrics.get(userId);
    if (metric) {
      metric.disconnectionCount++;
      const sessionTime = Date.now() - metric.lastConnected;
      metric.totalSessionTime += sessionTime;

      this.recordMetric('socket_disconnection', metric.disconnectionCount, {
        userId,
        sessionTime,
        totalSessionTime: metric.totalSessionTime,
      });
    }
  }

  // Track user engagement
  trackUserEngagement(
    userId: string,
    action: string,
    conversationId?: string,
    metadata?: Record<string, unknown>
  ): void {
    const engagement: UserEngagementMetric = {
      userId,
      action,
      timestamp: Date.now(),
      conversationId,
      metadata,
    };

    this.engagementMetrics.push(engagement);

    // Limit engagement metrics
    if (this.engagementMetrics.length > this.maxMetrics) {
      this.engagementMetrics = this.engagementMetrics.slice(-this.maxMetrics / 2);
    }

    this.recordMetric('user_engagement', 1, {
      action,
      conversationId,
      ...metadata,
    });
  }

  // Track API response times
  trackApiCall(endpoint: string, method: string, startTime: number): void {
    const responseTime = Date.now() - startTime;

    this.recordMetric('api_response_time', responseTime, {
      endpoint,
      method,
    });
  }

  // Track cache hit/miss
  trackCacheHit(cacheType: string, key: string): void {
    this.recordMetric('cache_hit', 1, { cacheType, key });
  }

  trackCacheMiss(cacheType: string, key: string): void {
    this.recordMetric('cache_miss', 1, { cacheType, key });
  }

  // Record a general metric
  private recordMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Limit stored metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }

    // Send to external analytics if callback is set
    if (this.analyticsCallback) {
      try {
        this.analyticsCallback(metric);
      } catch (error) {
        console.warn('Analytics callback failed:', error);
      }
    }

    // Log important metrics in development
    if (import.meta.env.DEV && this.shouldLogMetric(name)) {
      // eslint-disable-next-line no-console
      console.log(`[Performance] ${name}:`, value, metadata);
    }
  }

  // Determine which metrics to log in development
  private shouldLogMetric(name: string): boolean {
    const importantMetrics = [
      'message_delivery_time',
      'socket_connection_time',
      'api_response_time',
      'message_retry',
    ];
    return importantMetrics.includes(name);
  }

  // Get performance statistics
  getStats(): {
    totalMetrics: number;
    averageMessageDeliveryTime: number;
    averageConnectionTime: number;
    averageApiResponseTime: number;
    messageRetryRate: number;
    cacheHitRate: number;
    recentEngagement: UserEngagementMetric[];
  } {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 5 * 60 * 1000); // Last 5 minutes

    // Calculate averages
    const deliveryTimes = recentMetrics
      .filter(m => m.name === 'message_delivery_time')
      .map(m => m.value);

    const connectionTimes = recentMetrics
      .filter(m => m.name === 'socket_connection_time')
      .map(m => m.value);

    const apiResponseTimes = recentMetrics
      .filter(m => m.name === 'api_response_time')
      .map(m => m.value);

    const messagesSent = recentMetrics.filter(m => m.name === 'message_send_started').length;
    const messageRetries = recentMetrics.filter(m => m.name === 'message_retry').length;

    const cacheHits = recentMetrics.filter(m => m.name === 'cache_hit').length;
    const cacheMisses = recentMetrics.filter(m => m.name === 'cache_miss').length;

    const recentEngagement = this.engagementMetrics
      .filter(e => now - e.timestamp < 5 * 60 * 1000)
      .slice(-10); // Last 10 engagement events

    return {
      totalMetrics: this.metrics.length,
      averageMessageDeliveryTime: this.average(deliveryTimes),
      averageConnectionTime: this.average(connectionTimes),
      averageApiResponseTime: this.average(apiResponseTimes),
      messageRetryRate: messagesSent > 0 ? messageRetries / messagesSent : 0,
      cacheHitRate: cacheHits + cacheMisses > 0 ? cacheHits / (cacheHits + cacheMisses) : 0,
      recentEngagement,
    };
  }

  // Get metrics for a specific time range
  getMetricsInRange(startTime: number, endTime: number): PerformanceMetric[] {
    return this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  // Get metrics by name
  getMetricsByName(name: string, limit = 100): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name).slice(-limit);
  }

  // Clean up old metrics
  private cleanup(): void {
    const cutoff = Date.now() - 30 * 60 * 1000; // 30 minutes ago

    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.engagementMetrics = this.engagementMetrics.filter(e => e.timestamp > cutoff);

    // Clean up message metrics older than 30 minutes
    for (const [messageId, metric] of this.messageMetrics.entries()) {
      if (metric.sendTime < cutoff) {
        this.messageMetrics.delete(messageId);
      }
    }
  }

  // Calculate average
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  // Clear all metrics (for testing)
  clear(): void {
    this.metrics = [];
    this.connectionMetrics.clear();
    this.messageMetrics.clear();
    this.engagementMetrics = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions for common tracking scenarios
export const trackMessageSend = (
  messageId: string,
  type: 'text' | 'image' | 'file',
  size: number
) => {
  performanceMonitor.startMessageTracking(messageId, type, size);
};

export const trackMessageDelivered = (messageId: string) => {
  performanceMonitor.completeMessageDelivery(messageId);
};

export const trackMessageRead = (messageId: string) => {
  performanceMonitor.trackMessageRead(messageId);
};

export const trackUserAction = (
  userId: string,
  action: string,
  conversationId?: string,
  metadata?: Record<string, unknown>
) => {
  performanceMonitor.trackUserEngagement(userId, action, conversationId, metadata);
};

export const trackApiCall = (endpoint: string, method: string, startTime: number) => {
  performanceMonitor.trackApiCall(endpoint, method, startTime);
};

export const trackCacheOperation = (operation: 'hit' | 'miss', cacheType: string, key: string) => {
  if (operation === 'hit') {
    performanceMonitor.trackCacheHit(cacheType, key);
  } else {
    performanceMonitor.trackCacheMiss(cacheType, key);
  }
};

// Hook for external analytics integration
export const setAnalyticsCallback = (callback: (metric: PerformanceMetric) => void) => {
  performanceMonitor.setAnalyticsCallback(callback);
};
