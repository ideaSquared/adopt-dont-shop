# lib.analytics

Comprehensive user behavior tracking and analytics for adoption insights and platform optimization.

## Overview

This library provides a complete analytics solution for the adopt-dont-shop platform, featuring real-time event tracking, user journey analysis, performance monitoring, and comprehensive reporting capabilities.

## Features

### 🎯 Real-time Event Tracking
- User engagement events (clicks, views, interactions)
- Custom conversion tracking (adoptions, applications, favorites)
- Error tracking and debugging
- Performance timing measurements
- Automatic page view tracking with SPA support

### 📊 Analytics & Insights
- User engagement metrics (sessions, page views, bounce rate)
- System performance monitoring (load times, error rates)
- Conversion funnel analysis
- A/B testing results tracking
- User journey mapping and analysis

### ⚙️ Advanced Features
- Event sampling for high-traffic scenarios
- Batch processing with automatic queue management
- Session management with configurable timeouts
- Multiple analytics provider support (internal, Google Analytics, Mixpanel)
- Comprehensive error handling and retry logic

### 🔧 Configuration Options
- Debug logging for development
- Custom headers and API configuration
- Automatic vs manual page view tracking
- Configurable session timeouts and sample rates
- Multi-provider analytics integration

## Installation

```bash
npm install @adopt-dont-shop/lib-analytics
```

## Quick Start

```typescript
import { AnalyticsService } from '@adopt-dont-shop/lib-analytics';

// Initialize with default configuration
const analytics = new AnalyticsService({
  debug: false,
  provider: 'internal',
  autoTrackPageViews: true,
  sessionTimeout: 30,
  sampleRate: 100
});

// Track user interactions
await analytics.trackEvent({
  category: 'user_interaction',
  action: 'pet_favorite',
  label: 'golden_retriever',
  value: 1,
  userId: 'user123',
  properties: { petId: 'pet456', breed: 'Golden Retriever' }
});

// Track conversions
await analytics.trackConversion('adoption_completed', 1, { 
  petId: 'pet456',
  rescueId: 'rescue123' 
});

// Track errors
await analytics.trackError('API_TIMEOUT', { 
  endpoint: '/api/pets',
  responseTime: 5000 
});
```

## Core Functionality

### Event Tracking

```typescript
// User engagement events
await analytics.trackEvent({
  category: 'pet_discovery',
  action: 'swipe_right',
  label: 'interested',
  userId: 'user123',
  properties: {
    petId: 'pet456',
    petBreed: 'Labrador',
    sessionDuration: 300
  }
});

// Page view tracking (automatic or manual)
await analytics.trackPageView({
  url: '/pets/golden-retriever-123',
  title: 'Max - Golden Retriever for Adoption',
  userId: 'user123',
  timeOnPreviousPage: 45000
});

// User journey tracking
await analytics.trackUserJourney({
  journeyId: 'adoption_journey_789',
  userId: 'user123',
  sessionId: analytics.getSessionId(),
  startTime: new Date(),
  steps: [/* journey steps */],
  outcome: 'conversion',
  funnelStage: 'application_submitted'
});
```

### Analytics Queries

```typescript
// Get engagement metrics
const timeRange = {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
};

const engagement = await analytics.getEngagementMetrics(timeRange);
console.log('Page Views:', engagement.pageViews);
console.log('Unique Users:', engagement.uniqueUsers);
console.log('Bounce Rate:', engagement.bounceRate);

// Get system performance
const performance = await analytics.getSystemPerformance(timeRange);
console.log('Avg Load Time:', performance.avgPageLoadTime);
console.log('Error Rate:', performance.errorRate);

// Generate reports
const report = await analytics.generateReport('engagement', {
  timeRange,
  granularity: 'day',
  format: 'json'
});
console.log('Report ID:', report.id);
```

### Conversion Analysis

```typescript
// Analyze conversion funnels
const funnel = await analytics.getConversionFunnel('adoption_funnel', timeRange);
console.log('Overall Conversion Rate:', funnel.overallConversionRate);
console.log('Funnel Steps:', funnel.steps);

// A/B test results
const abTest = await analytics.getABTestResults('homepage_cta_test');
console.log('Winner:', abTest.winner);
console.log('Confidence:', abTest.confidence);
```

## Configuration

### Service Configuration

```typescript
const analytics = new AnalyticsService({
  // API Configuration
  apiUrl: 'https://api.example.com',
  debug: process.env.NODE_ENV === 'development',
  headers: {
    'Authorization': 'Bearer your-token'
  },
  
  // Analytics Provider
  provider: 'internal', // 'internal' | 'google-analytics' | 'mixpanel' | 'custom'
  trackingId: 'GA-XXXXX-X', // For third-party providers
  
  // Tracking Options
  autoTrackPageViews: true,
  sessionTimeout: 30, // minutes
  sampleRate: 100, // percentage (0-100)
});

// Runtime configuration updates
analytics.updateConfig({
  debug: true,
  sampleRate: 50
});
```

### Environment Variables

```bash
# API Configuration
VITE_API_URL=https://api.adopt-dont-shop.com
VITE_ANALYTICS_DEBUG=false

# Analytics Provider Settings
VITE_ANALYTICS_PROVIDER=internal
VITE_GA_TRACKING_ID=GA-XXXXX-X

# Performance Settings
VITE_ANALYTICS_SAMPLE_RATE=100
VITE_SESSION_TIMEOUT=30
```

## Advanced Usage

### Custom Event Properties

```typescript
// Track with custom properties
await analytics.trackEvent({
  category: 'adoption_application',
  action: 'form_step_completed',
  label: 'personal_information',
  properties: {
    stepNumber: 1,
    totalSteps: 5,
    timeSpent: 120,
    formErrors: [],
    fieldsFilled: ['name', 'email', 'phone'],
    userType: 'first_time_adopter'
  }
});
```

### Performance Monitoring

```typescript
// Track custom timing metrics
await analytics.trackTiming('api', 'pet_search', 850, 'advanced_filters');
await analytics.trackTiming('page', 'render_complete', 1200, 'pet_details');

// Track Core Web Vitals
await analytics.trackTiming('performance', 'largest_contentful_paint', 2400);
await analytics.trackTiming('performance', 'first_input_delay', 50);
await analytics.trackTiming('performance', 'cumulative_layout_shift', 0.1);
```

### Session Management

```typescript
// Get current session
const sessionId = analytics.getSessionId();

// Start new session (e.g., after login)
analytics.startNewSession();

// Session timeout handling
analytics.updateConfig({ sessionTimeout: 45 }); // 45 minutes
```

### Error Tracking

```typescript
// Application errors
await analytics.trackError('PAYMENT_PROCESSING_FAILED', {
  paymentProvider: 'stripe',
  amount: 50.00,
  errorCode: 'card_declined',
  userId: 'user123'
});

// API errors
await analytics.trackError('API_RATE_LIMIT', {
  endpoint: '/api/pets/search',
  rateLimitRemaining: 0,
  resetTime: new Date(Date.now() + 3600000)
});
```

## Integration Examples

### React Applications

```typescript
// Context provider for React apps
import { createContext, useContext } from 'react';
import { AnalyticsService } from '@adopt-dont-shop/lib-analytics';

const AnalyticsContext = createContext<AnalyticsService | null>(null);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const analytics = new AnalyticsService({
    autoTrackPageViews: true,
    debug: process.env.NODE_ENV === 'development'
  });

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export const useAnalytics = () => {
  const analytics = useContext(AnalyticsContext);
  if (!analytics) throw new Error('useAnalytics must be used within AnalyticsProvider');
  return analytics;
};

// In components
function PetCard({ pet }: { pet: Pet }) {
  const analytics = useAnalytics();

  const handleFavorite = async () => {
    await analytics.trackEvent({
      category: 'pet_interaction',
      action: 'favorite_added',
      label: pet.breed,
      properties: { petId: pet.id, shelterName: pet.shelter }
    });
  };

  return (
    <div onClick={handleFavorite}>
      {/* Pet card content */}
    </div>
  );
}
```

### Backend Integration

```typescript
// Express.js middleware
import { AnalyticsService } from '@adopt-dont-shop/lib-analytics';

const analytics = new AnalyticsService({
  apiUrl: process.env.ANALYTICS_API_URL,
  debug: process.env.NODE_ENV === 'development'
});

// Track API usage
app.use('/api/*', async (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - start;
    
    await analytics.trackEvent({
      category: 'api_usage',
      action: req.method,
      label: req.path,
      value: duration,
      properties: {
        statusCode: res.statusCode,
        userAgent: req.get('user-agent'),
        userId: req.user?.id
      }
    });
  });
  
  next();
});
```

## API Reference

### Core Methods

#### Event Tracking
- `trackEvent(event)` - Track user engagement events
- `trackPageView(pageView)` - Track page views
- `trackUserJourney(journey)` - Track complete user journeys
- `trackConversion(type, value?, properties?)` - Track conversion events
- `trackError(error, context?)` - Track application errors
- `trackTiming(category, variable, time, label?)` - Track performance metrics

#### Analytics Queries
- `getEngagementMetrics(timeRange, options?)` - Get user engagement data
- `getSystemPerformance(timeRange, options?)` - Get performance metrics
- `generateReport(type, params, options?)` - Generate analytics reports
- `getConversionFunnel(name, timeRange)` - Get funnel analysis
- `getABTestResults(testId)` - Get A/B test results

#### Configuration & Lifecycle
- `getConfig()` - Get current configuration
- `updateConfig(updates)` - Update service configuration
- `getSessionId()` - Get current session ID
- `startNewSession()` - Start new tracking session
- `healthCheck()` - Check service health
- `destroy()` - Clean up resources

### TypeScript Interfaces

```typescript
interface UserEngagementEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  properties?: Record<string, unknown>;
  url?: string;
  userAgent?: string;
  referrer?: string;
}

interface EngagementMetrics {
  period: TimeRange;
  pageViews: number;
  uniquePageViews: number;
  sessions: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ url: string; title: string; views: number }>;
  topEvents: Array<{ category: string; action: string; count: number }>;
  // ... and more
}

interface SystemPerformanceMetrics {
  period: TimeRange;
  avgPageLoadTime: number;
  p95PageLoadTime: number;
  errorRate: number;
  topErrors: Array<{ error: string; count: number }>;
  // ... and more
}
```

## Testing

The library includes 25+ comprehensive tests covering:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Categories
- ✅ Initialization and configuration
- ✅ Event tracking (engagement, page views, journeys)
- ✅ Analytics queries (metrics, reports, funnels)
- ✅ Sampling and queue management
- ✅ Error handling and retry logic
- ✅ Cleanup and lifecycle management
- ✅ Health checking

## Performance & Scalability

### Event Batching
Events are automatically batched and sent every 5 seconds to reduce API calls and improve performance.

### Sampling
Configure sample rates to handle high-traffic scenarios:
```typescript
const analytics = new AnalyticsService({
  sampleRate: 10 // Only track 10% of events
});
```

### Caching
Query results can be cached to improve performance:
```typescript
const metrics = await analytics.getEngagementMetrics(timeRange, {
  useCache: true,
  cacheTtl: 300 // 5 minutes
});
```

## Debugging

Enable debug mode for development:

```typescript
const analytics = new AnalyticsService({
  debug: true
});

// Or enable at runtime
analytics.updateConfig({ debug: true });
```

Debug mode provides:
- Event tracking confirmations
- API call logging
- Error details
- Queue status information

## Contributing

When extending the analytics library:

1. Add new event types to the TypeScript interfaces
2. Implement corresponding tracking methods
3. Add comprehensive tests for new functionality
4. Update documentation with usage examples
5. Ensure backward compatibility

## Best Practices

### Event Naming
Use consistent naming conventions:
- Categories: `user_interaction`, `pet_discovery`, `adoption_process`
- Actions: `click`, `view`, `favorite`, `apply`, `complete`
- Labels: Specific identifiers or descriptions

### Data Privacy
- Never track personally identifiable information (PII)
- Use user IDs instead of names or emails
- Implement data retention policies
- Respect user privacy preferences

### Performance
- Use appropriate sample rates for high-traffic events
- Batch events when possible
- Implement proper error handling
- Monitor analytics service health

## License

MIT License - see the LICENSE file for details.
├── dist/                             # Built output (generated)
├── docker-compose.lib.yml           # Docker compose for development
├── Dockerfile                       # Multi-stage Docker build
├── jest.config.js                   # Jest test configuration
├── package.json                     # Package configuration
├── tsconfig.json                    # TypeScript configuration
├── .eslintrc.json                   # ESLint configuration
├── .prettierrc.json                 # Prettier configuration
└── README.md                        # This file
```

## 🔗 Integration Examples

### With Other Libraries

```typescript
import { apiService } from '@adopt-dont-shop/lib-api';
import { authService } from '@adopt-dont-shop/lib-auth';
import { analyticsService } from '@adopt-dont-shop/lib-analytics';

// Configure with shared dependencies
analyticsService.updateConfig({
  apiUrl: apiService.getConfig().baseUrl,
  headers: {
    'Authorization': `Bearer ${authService.getToken()}`,
  },
});
```

### Error Handling

```typescript
import { analyticsService, ErrorResponse } from '@adopt-dont-shop/lib-analytics';

try {
  const result = await analyticsService.exampleMethod(data);
  // Handle success
} catch (error) {
  const errorResponse = error as ErrorResponse;
  console.error('Error:', errorResponse.error);
  console.error('Code:', errorResponse.code);
  console.error('Details:', errorResponse.details);
}
```

## 🚀 Deployment

### NPM Package (if publishing externally)

```bash
# Build and test
npm run build
npm run test

# Publish
npm publish
```

### Workspace Integration

The library is already integrated into the workspace. Apps can import it using:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib-analytics": "workspace:*"
  }
}
```

## 🤝 Contributing

1. Make changes to the library
2. Add/update tests
3. Run `npm run build` to ensure it builds correctly
4. Run `npm test` to ensure tests pass
5. Update documentation as needed

## 📄 License

MIT License - see the LICENSE file for details.

## 🔧 Troubleshooting

### Common Issues

1. **Module not found**
   - Ensure the library is built: `npm run build`
   - Check workspace dependencies are installed: `npm install`

2. **Type errors**
   - Run type checking: `npm run type-check`
   - Ensure TypeScript version compatibility

3. **Build failures**
   - Clean and rebuild: `npm run clean && npm run build`
   - Check for circular dependencies

### Debug Mode

Enable debug logging:

```typescript
analyticsService.updateConfig({ debug: true });
```

Or set environment variable:
```bash
NODE_ENV=development
```
