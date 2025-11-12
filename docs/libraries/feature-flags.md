# @adopt-dont-shop/lib-feature-flags

Comprehensive feature flag management with backend integration, Statsig support, intelligent caching, and A/B testing capabilities

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-feature-flags

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-feature-flags": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { FeatureFlagsService, FeatureFlagsServiceConfig } from '@adopt-dont-shop/lib-feature-flags';

// Using the singleton instance
import { featureFlagsService } from '@adopt-dont-shop/lib-feature-flags';

// Basic feature flag check
const isNewDashboardEnabled = await featureFlagsService.isFeatureEnabled('new_dashboard');
if (isNewDashboardEnabled) {
  // Show new dashboard
}

// Advanced configuration
const service = new FeatureFlagsService({
  apiUrl: 'https://api.example.com',
  statsigClientKey: 'client-your-statsig-key',
  enableStatsig: true,
  debug: true,
  cacheTtl: 5 * 60 * 1000, // 5 minutes
  maxCacheSize: 200,
});
```

## 🔧 Configuration

### FeatureFlagsServiceConfig

| Property           | Type      | Default                    | Description                       |
| ------------------ | --------- | -------------------------- | --------------------------------- |
| `apiUrl`           | `string`  | `process.env.VITE_API_URL` | Backend API URL                   |
| `statsigClientKey` | `string`  | `undefined`                | Statsig SDK client key            |
| `enableStatsig`    | `boolean` | `true`                     | Enable Statsig integration        |
| `debug`            | `boolean` | `false`                    | Enable debug logging              |
| `cacheTtl`         | `number`  | `300000`                   | Cache TTL in milliseconds (5 min) |
| `maxCacheSize`     | `number`  | `200`                      | Maximum cache entries             |

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# Statsig Configuration
VITE_STATSIG_CLIENT_KEY=client-your-statsig-key
REACT_APP_STATSIG_CLIENT_KEY=client-your-statsig-key

# Development
NODE_ENV=development
```

## 📖 API Reference

### FeatureFlagsService

#### Backend Feature Flag Methods

##### `isFeatureEnabled(flagName, options?)`

Check if a backend feature flag is enabled.

```typescript
const isEnabled = await featureFlagsService.isFeatureEnabled('new_dashboard', {
  useCache: true,
  timeout: 5000,
});
```

##### `getAllFlags(filters?, options?)`

Get all feature flags with optional filtering.

```typescript
const flags = await featureFlagsService.getAllFlags(
  {
    enabled: true,
    search: 'ui_',
    category: 'frontend',
  },
  {
    useCache: true,
    forceRefresh: false,
  }
);
```

##### `setFlag(flagName, flagData, options?)`

Create or update a feature flag.

```typescript
await featureFlagsService.setFlag('beta_features', {
  name: 'beta_features',
  description: 'Enable beta features for testing',
  enabled: true,
  config: {
    rolloutPercentage: 25,
    allowedUserGroups: ['beta_testers', 'premium_users'],
  },
});
```

##### `deleteFlag(flagName, options?)`

Delete a feature flag.

```typescript
await featureFlagsService.deleteFlag('obsolete_feature');
```

##### `getPublicFlags(options?)`

Get public flags safe for client-side use.

```typescript
const publicFlags = await featureFlagsService.getPublicFlags();
// Returns: { ui_show_beta: true, feature_social_sharing: false, ... }
```

#### Statsig Integration Methods

##### `updateUser(user)`

Set user context for Statsig personalization.

```typescript
import { StatsigUser } from '@adopt-dont-shop/lib-feature-flags';

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
```

##### `checkGate(gateName)`

Check Statsig feature gates.

```typescript
const showNewFeature = featureFlagsService.checkGate('new_feature_rollout');
const allowFileUploads = featureFlagsService.checkGate('file_upload_enabled');
```

##### `getExperiment(experimentName)`

Get experiment configuration and variant.

```typescript
const buttonExperiment = featureFlagsService.getExperiment('button_color_test');
const buttonColor = buttonExperiment?.parameters.color || 'blue';
const variant = buttonExperiment?.groupName; // 'control' or 'test'
```

##### `getDynamicConfig(configName)`

Get dynamic configuration values.

```typescript
const appConfig = featureFlagsService.getDynamicConfig('app_settings');
const maxFileSize = appConfig?.value.maxUploadSizeMB || 10;
const apiTimeout = appConfig?.value.apiTimeoutMs || 5000;
```

#### Analytics and Monitoring

##### `getMetrics()`

Get feature flag usage metrics.

```typescript
const metrics = featureFlagsService.getMetrics();
console.log(`Total flags: ${metrics.totalFlags}`);
console.log(`Enabled flags: ${metrics.enabledFlags}`);
console.log(`Cache hit rate: ${metrics.cacheHitRate * 100}%`);
```

##### `getCacheStats()`

Get cache performance statistics.

```typescript
const cacheStats = featureFlagsService.getCacheStats();
console.log(`Cache size: ${cacheStats.size}/${cacheStats.maxSize}`);
console.log(`Cache hit rate: ${cacheStats.hitRate * 100}%`);
```

##### `logEvent(eventName, value?, metadata?)`

Log feature flag events for analytics.

```typescript
featureFlagsService.logEvent('feature_used', 1, {
  feature_name: 'new_dashboard',
  user_type: 'premium',
  session_duration: 1200,
});
```

##### `getRecentEvents(limit?)`

Get recent feature flag events.

```typescript
const recentEvents = featureFlagsService.getRecentEvents(50);
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

```typescript
// Feature Flags Hook
import { createContext, useContext, useEffect, useState } from 'react';
import { FeatureFlagsService } from '@adopt-dont-shop/lib-feature-flags';

const FeatureFlagsContext = createContext<FeatureFlagsService | null>(null);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [service] = useState(() => new FeatureFlagsService({
    enableStatsig: true,
    debug: process.env.NODE_ENV === 'development'
  }));

  useEffect(() => {
    // Set user context
    if (user) {
      service.updateUser({
        userID: user.id,
        email: user.email,
        custom: {
          plan: user.subscription?.plan || 'free',
          signupDate: user.createdAt
        }
      });
    }
  }, [user]);

  return (
    <FeatureFlagsContext.Provider value={service}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export const useFeatureFlags = () => {
  const service = useContext(FeatureFlagsContext);
  if (!service) throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  return service;
};

// Feature Flag Hook
export function useFeatureFlag(flagName: string) {
  const service = useFeatureFlags();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFlag = async () => {
      try {
        const enabled = await service.isFeatureEnabled(flagName);
        setIsEnabled(enabled);
      } catch (error) {
        console.error(`Error checking feature flag ${flagName}:`, error);
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkFlag();
  }, [flagName]);

  return { isEnabled, loading };
}

// In components
function Dashboard() {
  const { isEnabled: showNewDashboard, loading } = useFeatureFlag('new_dashboard');
  const featureFlags = useFeatureFlags();

  // Statsig experiment
  const buttonExperiment = featureFlags.getExperiment('cta_button_test');
  const buttonVariant = buttonExperiment?.groupName || 'control';

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {showNewDashboard ? <NewDashboard /> : <LegacyDashboard />}
      <CTAButton variant={buttonVariant} />
    </div>
  );
}
```

### Node.js Backend (service.backend)

```typescript
// src/services/feature-flags.service.ts
import { FeatureFlagsService } from '@adopt-dont-shop/lib-feature-flags';

export const featureFlagsService = new FeatureFlagsService({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In middleware
export const featureFlagMiddleware = (flagName: string, fallback = false) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isEnabled = await featureFlagsService.isFeatureEnabled(flagName);
      req.featureEnabled = isEnabled;

      if (!isEnabled && fallback) {
        return res.status(404).json({ error: 'Feature not available' });
      }

      next();
    } catch (error) {
      req.featureEnabled = fallback;
      next();
    }
  };
};

// In routes
app.get('/api/v2/pets', featureFlagMiddleware('api_v2_enabled'), async (req, res) => {
  if (req.featureEnabled) {
    // Use new API logic
    const pets = await newPetService.getPets(req.query);
    res.json(pets);
  } else {
    // Fallback to old API
    const pets = await legacyPetService.getPets(req.query);
    res.json(pets);
  }
});
```

## 🧪 Testing

The library includes comprehensive Jest tests covering:

- ✅ Backend feature flag operations
- ✅ Statsig integration (mocked)
- ✅ Caching mechanisms
- ✅ Error handling and fallbacks
- ✅ Analytics and metrics
- ✅ Configuration management
- ✅ User context management

Run tests:

```bash
npm run test:lib-feature-flags
```

## 🚀 Key Features

### Backend Integration

- **Full CRUD Operations**: Create, read, update, delete feature flags
- **Advanced Filtering**: Search and filter flags by category, status
- **Public Flags**: Safe client-side flag exposure
- **Real-time Updates**: Cache invalidation and live updates

### Statsig Integration

- **Feature Gates**: Simple on/off feature toggles
- **Experiments**: A/B and multivariate testing
- **Dynamic Config**: Remote configuration management
- **User Targeting**: Personalized feature rollouts

### Performance & Reliability

- **Intelligent Caching**: LRU cache with TTL optimization
- **Error Resilience**: Graceful degradation when services fail
- **Batching**: Efficient bulk flag operations
- **Monitoring**: Comprehensive metrics and analytics

### Developer Experience

- **TypeScript Support**: Full type safety and IntelliSense
- **Debug Mode**: Detailed logging for development
- **React Hooks**: Easy integration with React apps
- **Middleware**: Express.js middleware for backend routing

## 🔧 Troubleshooting

### Common Issues

**Flags not updating**:

- Check cache TTL settings and force refresh options
- Verify API connectivity and authentication
- Enable debug mode for detailed logging

**Statsig integration issues**:

- Verify client key configuration
- Check user context setup
- Review Statsig console for experiment status

**Performance concerns**:

- Monitor cache hit rates and optimize TTL
- Use bulk operations for multiple flag checks
- Implement proper error handling and fallbacks

### Debug Mode

```typescript
const featureFlags = new FeatureFlagsService({
  debug: true, // Enables comprehensive logging
});
```

This library provides enterprise-grade feature flag management with seamless integration between backend flags and Statsig experimentation, optimized for modern web applications with comprehensive caching and analytics.
