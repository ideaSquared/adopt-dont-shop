# @adopt-dont-shop/lib-feature-flags

Comprehensive feature flag management with backend integration, Statsig support, intelligent caching, and A/B testing capabilities.

## Overview

This library provides a unified interface for feature flag management, combining backend feature flags, Statsig integration for A/B testing, intelligent caching, event tracking, and comprehensive analytics. It supports both server-side and client-side feature flag management.

## Features

- **Backend Integration**: Full CRUD operations for backend feature flags
- **Statsig Integration**: Support for feature gates, experiments, and dynamic configs
- **Intelligent Caching**: LRU cache with TTL for optimal performance
- **Event Tracking**: Comprehensive event logging and analytics
- **A/B Testing**: Experiment management and variant assignment
- **Dynamic Configuration**: Remote configuration updates without code changes
- **Performance Monitoring**: Flag usage statistics and performance metrics
- **Error Resilience**: Graceful degradation when services are unavailable
- **Real-time Updates**: Cache invalidation and real-time flag updates

## Installation

```bash
npm install @adopt-dont-shop/lib-feature-flags
```

## Usage

### Basic Setup

```typescript
import { FeatureFlagsService } from '@adopt-dont-shop/lib-feature-flags';

const featureFlagsService = new FeatureFlagsService({
  apiUrl: 'https://api.example.com',
  statsigClientKey: 'client-your-statsig-key',
  enableStatsig: true,
  debug: true,
});
```

### Backend Feature Flags

```typescript
import { FeatureFlagData } from '@adopt-dont-shop/lib-feature-flags';

// Check if a feature is enabled
const isEnabled = await featureFlagsService.isFeatureEnabled('new_dashboard');
console.log(`New dashboard: ${isEnabled ? 'enabled' : 'disabled'}`);

// Get all feature flags with filters
const flags = await featureFlagsService.getAllFlags({
  enabled: true,
  search: 'ui_',
});

// Create or update a feature flag
const flagData: FeatureFlagData = {
  name: 'beta_features',
  description: 'Enable beta features for testing',
  enabled: true,
  config: {
    rolloutPercentage: 25,
    allowedUserGroups: ['beta_testers', 'premium_users'],
  },
};

const newFlag = await featureFlagsService.setFlag('beta_features', flagData);

// Delete a feature flag
await featureFlagsService.deleteFlag('obsolete_feature');

// Get public flags (safe for client-side use)
const publicFlags = await featureFlagsService.getPublicFlags();
```

### Statsig Integration

```typescript
import { StatsigUser } from '@adopt-dont-shop/lib-feature-flags';

// Set user context for Statsig
const user: StatsigUser = {
  userID: 'user_12345',
  email: 'user@example.com',
  customIDs: { organizationID: 'org_456' },
  custom: {
    plan: 'premium',
    signupDate: '2024-01-15',
    lastActiveDate: '2024-12-01',
  },
};

featureFlagsService.updateUser(user);

// Check feature gates
const showNewFeature = featureFlagsService.checkGate('new_feature_rollout');
const allowFileUploads = featureFlagsService.checkGate('file_upload_enabled');

// Get experiment configuration
const buttonExperiment = featureFlagsService.getExperiment('button_color_test');
const buttonColor = buttonExperiment?.parameters.color || 'blue';

// Get dynamic configuration
const appConfig = featureFlagsService.getDynamicConfig('app_settings');
const maxFileSize = appConfig?.value.maxUploadSizeMB || 10;
const apiTimeout = appConfig?.value.apiTimeoutMs || 5000;
```

### Event Tracking and Analytics

```typescript
// Log feature usage events
featureFlagsService.logEvent('feature_used', 1, {
  feature_name: 'new_dashboard',
  user_type: 'premium',
  session_duration: 1200,
});

// Log experiment events
featureFlagsService.logEvent('experiment_impression', 1, {
  experiment_name: 'button_color_test',
  variant: 'red_button',
  page: 'landing',
});

// Log conversion events
featureFlagsService.logEvent('conversion', 29.99, {
  experiment_name: 'checkout_flow_test',
  variant: 'simplified_checkout',
  conversion_type: 'purchase',
});

// Get recent events
const recentEvents = featureFlagsService.getRecentEvents(50);
console.log('Recent events:', recentEvents);
```

### Performance Monitoring

```typescript
// Get feature flag metrics
const metrics = featureFlagsService.getMetrics();
console.log(`Total flags: ${metrics.totalFlags}`);
console.log(`Enabled flags: ${metrics.enabledFlags}`);
console.log(`Cache hit rate: ${metrics.cacheHitRate * 100}%`);

// Get cache statistics
const cacheStats = featureFlagsService.getCacheStats();
console.log(`Cache size: ${cacheStats.size}/${cacheStats.maxSize}`);
console.log(`Cache hit rate: ${cacheStats.hitRate * 100}%`);

// Get flag usage statistics
const flagUsage = metrics.flagUsageStats;
console.log('Most used flags:');
for (const [flagName, count] of flagUsage.entries()) {
  console.log(`  ${flagName}: ${count} checks`);
}
```

## API Reference

### FeatureFlagsService

#### Constructor

```typescript
new FeatureFlagsService(config?: FeatureFlagsServiceConfig)
```

**Key Configuration Options:**
- `apiUrl` - Backend API URL for feature flags
- `statsigClientKey` - Statsig SDK client key
- `enableStatsig` - Enable Statsig integration (default: true)
- `debug` - Enable debug logging (default: false)
- `cacheTtl` - Cache TTL in milliseconds (default: 300000)
- `maxCacheSize` - Maximum cache entries (default: 200)

#### Backend Feature Flag Methods

- `isFeatureEnabled(flagName, options?)` - Check if a flag is enabled
- `getAllFlags(filters?, options?)` - Get all flags with filtering
- `setFlag(flagName, flagData, options?)` - Create or update a flag
- `deleteFlag(flagName, options?)` - Delete a flag
- `getPublicFlags(options?)` - Get public flags for client use

#### Statsig Integration Methods

- `checkGate(gateName, user?)` - Check feature gate
- `getExperiment(experimentName, user?)` - Get experiment config
- `getDynamicConfig(configName, user?)` - Get dynamic config
- `updateUser(user)` - Update user context

#### Analytics and Monitoring

- `logEvent(eventName, value?, metadata?)` - Log analytics events
- `getMetrics()` - Get performance metrics
- `getCacheStats()` - Get cache statistics
- `getRecentEvents(limit?)` - Get recent events

## Testing

The library includes 38 comprehensive tests covering all functionality:

```bash
npm test
```

Test categories:
- Backend feature flag operations
- Statsig integration
- Caching behavior and TTL
- Event logging and metrics
- Error handling and resilience
- Performance monitoring

## Real-world Examples

### React Component Integration

```tsx
import React, { useEffect, useState } from 'react';
import { featureFlagsService } from '@/services/feature-flags';

function DashboardComponent() {
  const [showNewDesign, setShowNewDesign] = useState(false);
  const [experimentVariant, setExperimentVariant] = useState('control');

  useEffect(() => {
    // Check backend feature flag
    featureFlagsService.isFeatureEnabled('new_dashboard_design')
      .then(setShowNewDesign);

    // Check Statsig experiment
    const experiment = featureFlagsService.getExperiment('dashboard_layout_test');
    if (experiment) {
      setExperimentVariant(experiment.parameters.layout || 'control');
    }

    // Log page view
    featureFlagsService.logEvent('dashboard_viewed', 1, {
      layout_variant: experimentVariant,
      has_new_design: showNewDesign,
    });
  }, []);

  return (
    <div className={`dashboard ${showNewDesign ? 'new-design' : 'classic'}`}>
      {experimentVariant === 'sidebar' ? (
        <SidebarLayout />
      ) : (
        <TopNavLayout />
      )}
    </div>
  );
}
```

### Node.js Middleware

```typescript
// middleware/feature-flags.middleware.ts
export const requireFeatureFlag = (flagName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isEnabled = await featureFlagsService.isFeatureEnabled(flagName);
      
      if (!isEnabled) {
        return res.status(403).json({
          error: 'Feature not available',
          code: 'FEATURE_DISABLED',
        });
      }
      
      next();
    } catch (error) {
      console.error('Feature flag check failed:', error);
      // Fail open - allow access if check fails
      next();
    }
  };
};
```

## Performance and Caching

The library uses intelligent caching to optimize performance:

- **TTL-based Expiration**: Cached entries expire after configured time
- **LRU Eviction**: Least recently used entries removed when cache is full
- **Selective Invalidation**: Cache cleared when flags are modified
- **Background Cleanup**: Expired entries cleaned automatically

### Performance Tips

1. **Configure appropriate TTL**: Balance freshness with performance
2. **Use batch operations**: `getAllFlags()` vs multiple `isFeatureEnabled()` calls
3. **Monitor cache hit rates**: Adjust cache size based on usage patterns
4. **Handle errors gracefully**: Always provide fallback values

## Configuration

### Environment Variables

```bash
# Backend API
API_URL=https://api.example.com
API_TOKEN=your-api-token

# Statsig Integration
STATSIG_CLIENT_KEY=client-your-statsig-key

# Cache Configuration
FEATURE_FLAG_CACHE_TTL=300000
FEATURE_FLAG_MAX_CACHE_SIZE=500

# Development
NODE_ENV=development
DEBUG_FEATURE_FLAGS=true
```

## Integration with Other Libraries

```typescript
import { apiService } from '@adopt-dont-shop/lib-api';
import { authService } from '@adopt-dont-shop/lib-auth';

// Configure with shared dependencies
featureFlagsService.updateConfig({
  apiUrl: apiService.getConfig().baseUrl,
  headers: {
    'Authorization': `Bearer ${authService.getToken()}`,
  },
});
```

## Error Handling

The service provides comprehensive error handling with graceful degradation:

- **API Failures**: Returns safe defaults (false for flags, empty arrays/objects)
- **Network Issues**: Falls back to cached results when possible
- **Service Unavailability**: Continues with last known state or defaults

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the library
npm run build

# Type checking
npm run type-check
```

## Migration from Direct Statsig Usage

Migration from direct Statsig usage is straightforward:

### Before
```typescript
const { checkGate } = useStatsig();
const isEnabled = checkGate('new_feature');
```

### After
```typescript
// Same API, but with backend integration and caching
const isEnabled = featureFlagsService.checkGate('new_feature');
const backendFlag = await featureFlagsService.isFeatureEnabled('backend_feature');
```

## Dependencies

- **No runtime dependencies** - Built with vanilla TypeScript
- Compatible with both Node.js and browser environments
- Optional Statsig integration for advanced A/B testing
