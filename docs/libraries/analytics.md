# @adopt-dont-shop/lib-analytics

User behavior tracking and analytics for adoption insights and platform optimization

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-analytics

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-analytics": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { AnalyticsService, AnalyticsServiceConfig } from '@adopt-dont-shop/lib-analytics';

// Using the singleton instance
import { analyticsService } from '@adopt-dont-shop/lib-analytics';

// Track user events
await analyticsService.trackEvent({
  category: 'pet_interaction',
  action: 'favorite_added',
  label: 'Golden Retriever',
  value: 1,
  metadata: { petId: 'pet_123', userId: 'user_456' },
});

// Track page views
await analyticsService.trackPageView({
  page: '/pets/search',
  title: 'Pet Search',
  metadata: { searchQuery: 'dogs near me' },
});
```

## 🔧 Configuration

### AnalyticsServiceConfig

| Property             | Type                                              | Default                                  | Description                    |
| -------------------- | ------------------------------------------------- | ---------------------------------------- | ------------------------------ |
| `provider`           | `'google-analytics' \| 'mixpanel' \| 'amplitude'` | `'google-analytics'`                     | Analytics provider             |
| `debug`              | `boolean`                                         | `process.env.NODE_ENV === 'development'` | Enable debug logging           |
| `autoTrackPageViews` | `boolean`                                         | `true`                                   | Automatically track page views |
| `sessionTimeout`     | `number`                                          | `30`                                     | Session timeout in minutes     |
| `sampleRate`         | `number`                                          | `100`                                    | Sampling rate (0-100)          |

### Environment Variables

```bash
# Analytics Configuration
VITE_GA_TRACKING_ID=GA-XXXXXXXXX
VITE_MIXPANEL_TOKEN=your-mixpanel-token
VITE_AMPLITUDE_API_KEY=your-amplitude-key

# Development
NODE_ENV=development
```

## 📖 API Reference

### AnalyticsService

#### Core Methods

##### `trackEvent(eventData, options?)`

Track user interaction events for detailed behavior analysis.

```typescript
await analyticsService.trackEvent({
  category: 'adoption_flow',
  action: 'application_submitted',
  label: 'Dog Adoption',
  value: 1,
  metadata: {
    petId: 'pet_123',
    rescueId: 'rescue_456',
    applicationId: 'app_789',
  },
});
```

##### `trackPageView(pageData, options?)`

Track page views and navigation patterns.

```typescript
await analyticsService.trackPageView({
  page: '/pets/dog-123',
  title: 'Buddy - Golden Retriever',
  metadata: {
    petType: 'dog',
    breed: 'Golden Retriever',
    rescueId: 'rescue_456',
  },
});
```

##### `trackUserJourney(journeyData, options?)`

Track complete user journey flows.

```typescript
await analyticsService.trackUserJourney({
  journeyId: 'adoption_journey_123',
  step: 'pet_selected',
  totalSteps: 5,
  metadata: {
    petId: 'pet_123',
    timeSpent: 1200,
    previousStep: 'search_results',
  },
});
```

##### `trackConversion(conversionData, options?)`

Track conversion events and success metrics.

```typescript
await analyticsService.trackConversion({
  type: 'adoption_completed',
  value: 350.0,
  currency: 'USD',
  metadata: {
    petId: 'pet_123',
    rescueId: 'rescue_456',
    applicationId: 'app_789',
  },
});
```

#### Analytics Queries

##### `getEngagementMetrics(dateRange?, options?)`

Retrieve user engagement analytics.

```typescript
const metrics = await analyticsService.getEngagementMetrics({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
});
```

##### `getConversionFunnel(funnelConfig, options?)`

Analyze conversion funnel performance.

```typescript
const funnelData = await analyticsService.getConversionFunnel({
  steps: ['search', 'pet_view', 'application_start', 'application_submit'],
  dateRange: { startDate: '2024-01-01', endDate: '2024-01-31' },
});
```

##### `getPerformanceMetrics(options?)`

Get system performance and usage metrics.

```typescript
const performance = await analyticsService.getPerformanceMetrics();
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

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
      metadata: { petId: pet.id }
    });
  };

  return <div>{/* Pet card JSX */}</div>;
}
```

### Node.js Backend (service.backend)

```typescript
// src/services/analytics.service.ts
import { AnalyticsService } from '@adopt-dont-shop/lib-analytics';

export const analyticsService = new AnalyticsService({
  provider: 'mixpanel',
  debug: process.env.NODE_ENV === 'development',
});

// In your routes or controllers
import { analyticsService } from '../services/analytics.service';

app.post('/api/pets/:id/favorite', async (req, res) => {
  // ... business logic ...

  // Track the event
  await analyticsService.trackEvent({
    category: 'pet_interaction',
    action: 'favorite_added',
    metadata: {
      petId: req.params.id,
      userId: req.user.id,
    },
  });

  res.json({ success: true });
});
```

## 🧪 Testing

The library includes comprehensive Jest tests covering:

- ✅ Service initialization and configuration
- ✅ Event tracking functionality
- ✅ Page view tracking
- ✅ User journey tracking
- ✅ Conversion tracking
- ✅ Analytics queries
- ✅ Error handling
- ✅ Performance metrics

Run tests:

```bash
npm run test:lib-analytics
```

## 🚀 Key Features

### Comprehensive Event Tracking

- **User Interactions**: Click tracking, form submissions, feature usage
- **Pet-Specific Events**: Favorites, applications, adoptions, searches
- **Conversion Tracking**: Applications submitted, adoptions completed
- **Performance Monitoring**: Page load times, API response times

### Advanced Analytics

- **Funnel Analysis**: Track user progression through adoption flow
- **Cohort Analysis**: User retention and engagement over time
- **A/B Testing**: Experiment tracking and variant performance
- **Real-time Dashboards**: Live metrics and insights

### Privacy & Compliance

- **GDPR Compliant**: User consent management and data controls
- **Data Anonymization**: PII protection and user privacy
- **Opt-out Support**: User preference management
- **Secure Collection**: Encrypted data transmission

## 🔧 Troubleshooting

### Common Issues

**Events not tracking**:

- Check provider configuration and API keys
- Verify network connectivity
- Enable debug mode for detailed logging

**Performance issues**:

- Implement event batching for high-volume tracking
- Use sampling for non-critical events
- Monitor API rate limits

### Debug Mode

```typescript
const analytics = new AnalyticsService({
  debug: true, // Enables detailed logging
});
```

This library provides production-ready analytics capabilities optimized for pet adoption platforms with comprehensive tracking, privacy compliance, and actionable insights.
